import type {
  ApiError,
  CreateInteractionRequest,
  CreateLeadRequest,
  Lead as LeadResource,
  LeadDetail,
} from '@ai-academy/shared';
import type { INestApplication } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Test } from '@nestjs/testing';
import { testDatabaseOptions, truncateAll } from '@test/helpers';
import { Sequelize } from 'sequelize-typescript';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureApp } from '../common/configure-app';
import { InteractionsModule } from '../interactions/interactions.module';
import { LeadsModule } from './leads.module';

/**
 * The two score endpoints over real HTTP against real Postgres.
 *
 * Nothing is stubbed here — unlike the summary spec there is no network
 * boundary to replace, because scoring is arithmetic. The migrations built the
 * schema, both CHECK constraints are live, and ParseUUIDPipe and the exception
 * filter are the ones main.ts ships.
 *
 * Two tests in this file exist because of specific traps rather than because of
 * a requirement, and deleting either would restore a silent failure:
 *
 *   - "carries the score on every list row" is the `toLead` allowlist test.
 *     Adding columns to the model does NOT put them on the wire. Without the
 *     mapper entry the API compiles, ESLint passes, every other test goes
 *     green, and the browser receives `undefined` for every score.
 *   - "answers the bulk route rather than reading it as an id" pins that the
 *     literal route is reachable at all. Nest matches routes in declaration
 *     order, so a literal segment declared after a param route can be captured
 *     as the param and rejected by ParseUUIDPipe. These two paths turn out not
 *     to collide — `recalculate` is not `score`, so the match fails either way
 *     round — but the test costs one line and catches the rename that makes
 *     them collide. See the comment on the route in leads.controller.ts.
 *
 * Scores are asserted as exact integers, not ranges. The inputs are fixed and
 * the formula is deterministic, so a range would only hide a change in the
 * weights.
 */

/** No interactions, so this lead scores 0 recency + 0 engagement + 7 budget + 15 qualified. */
const VALID_LEAD: CreateLeadRequest = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  status: 'qualified',
  budget: 480000,
  location: 'Littleton',
  propertyType: 'condo',
  inquiryDate: '2026-06-05',
};

const UNTOUCHED_SCORE = 22;

/** The same lead after one interaction today: 40 recency + 10 engagement + 7 + 15. */
const JUST_CONTACTED_SCORE = 72;

/** A syntactically valid UUID that is not in the database. */
const ABSENT_ID = '11111111-1111-4111-8111-111111111111';

describe('the lead activity score endpoints', () => {
  let app: INestApplication;
  let http: App;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        SequelizeModule.forRoot(testDatabaseOptions()),
        LeadsModule,
        InteractionsModule,
      ],
    }).compile();

    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    http = app.getHttpServer() as App;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateAll(app.get(Sequelize));
  });

  describe('POST /api/leads/:id/score', () => {
    it('answers 200 with the whole lead, scored', async () => {
      // 200 rather than 201, and the whole Lead rather than just the score
      // (R3): both fields live on `Lead` itself, so there is no new wire type
      // and nothing for the client to splice in.
      const id = await createLead();

      const { status, body } = await postScore(id);

      expect(status).toBe(200);
      expect(body.id).toBe(id);
      expect(body.activityScore).toBe(UNTOUCHED_SCORE);
      expect(body.scoreCalculatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    });

    it('returns the score as a JSON number, not a string', async () => {
      // The PostgreSQL-returns-strings trap. The column is INTEGER so the pg
      // driver hands back a number; NUMERIC or BIGINT would arrive as "22" and
      // every comparison in the client's sort would be lexicographic.
      const id = await createLead();

      const { body } = await postScore(id);

      expect(typeof body.activityScore).toBe('number');
    });

    it('stamps scoreCalculatedAt server-side, near now', async () => {
      const id = await createLead();

      const { body } = await postScore(id);

      expect(new Date(body.scoreCalculatedAt ?? 0).getTime()).toBeGreaterThan(
        Date.now() - 60_000,
      );
    });

    it('writes the row, so a later GET is the stored score and not a fresh one', async () => {
      // The "survives a refresh without recomputation" criterion, at the API
      // level: the same timestamp to the millisecond is the stored row coming
      // back rather than a recalculation.
      const id = await createLead();
      const { body: scored } = await postScore(id);

      const { body: detail } = await getLead(id);

      expect(detail.activityScore).toBe(scored.activityScore);
      expect(detail.scoreCalculatedAt).toBe(scored.scoreCalculatedAt);
    });

    it('raises the score once an interaction is logged', async () => {
      // End to end proof that the formula reads live data rather than
      // something cached at creation: recency and engagement both move.
      const id = await createLead();
      const { body: before } = await postScore(id);

      await logInteraction(id);
      const { body: after } = await postScore(id);

      expect(before.activityScore).toBe(UNTOUCHED_SCORE);
      expect(after.activityScore).toBe(JUST_CONTACTED_SCORE);
      expect(after.activityScore).toBeGreaterThan(before.activityScore ?? 0);
    });

    it('answers 400, not 500, for an id that is not a UUID', async () => {
      // Without ParseUUIDPipe this reaches Postgres and comes back as a 500
      // wrapping 22P02, which the frontend reads as "the server is broken"
      // rather than "that is not an id".
      const { status } = await send<ApiError>(
        request(http).post('/api/leads/not-a-uuid/score'),
      );

      expect(status).toBe(400);
    });

    it('answers 404 for an id that is not there', async () => {
      const { status } = await send<ApiError>(
        request(http).post(`/api/leads/${ABSENT_ID}/score`),
      );

      expect(status).toBe(404);
    });
  });

  describe('POST /api/leads/scores/recalculate', () => {
    it('answers the bulk route rather than reading it as an id', async () => {
      // 200, not the 400 a route captured as `:id` would give. Measured: these
      // two paths do not collide, so this passes with the declarations either
      // way round — it is here to catch the rename that makes them collide,
      // not to prove today's order. See leads.controller.ts.
      const { status } = await postRecalculateAll();

      expect(status).toBe(200);
    });

    it('scores every lead in the book', async () => {
      await createLead();
      await createLead('grace@example.com');
      const contacted = await createLead('linus@example.com');
      await logInteraction(contacted);

      const { body } = await postRecalculateAll();

      expect(body).toHaveLength(3);
      expect(body.map((lead) => lead.activityScore).sort()).toEqual([
        UNTOUCHED_SCORE,
        UNTOUCHED_SCORE,
        JUST_CONTACTED_SCORE,
      ]);
      expect(
        body.every((lead) => typeof lead.scoreCalculatedAt === 'string'),
      ).toBe(true);
    });

    it('returns the rows in the order GET /api/leads returns them', async () => {
      // R3. The client replaces its table wholesale from this response, so a
      // different order here would reshuffle the list only after the button.
      await createLead();
      await createLead('grace@example.com');
      await createLead('linus@example.com');

      const { body: recalculated } = await postRecalculateAll();
      const { body: listed } = await getLeads();

      expect(recalculated.map((lead) => lead.id)).toEqual(
        listed.map((lead) => lead.id),
      );
    });

    it('breaks a tie on both sort keys by id, so both endpoints agree', async () => {
      // Leads created over HTTP get distinct createdAt values, so they cannot
      // tie and the ordering bug hides. The SEEDER inserts all 100 rows in one
      // bulkCreate and they share a created_at to the millisecond; the
      // committed CSV leaves 79 distinct (inquiry_date, created_at) pairs
      // across 100 leads.
      //
      // Measured against the seeded dev database before `id` became the third
      // sort key: findAll's plain SELECT and rescoreAll's join returned the
      // same 100 rows in DIFFERENT orders, which is the table reshuffling
      // after the Recalculate button.
      //
      // The assertion is that ties come back in id order, NOT merely that the
      // two endpoints agree. Agreement is the symptom and it is not reliably
      // reproducible — an arbitrary order is entitled to be the same arbitrary
      // order twice, and on a small table it usually is, so that assertion
      // passes with or without the fix. A total ordering is the actual
      // contract, and twelve random UUIDs arrive sorted by accident about once
      // in 479 million times.
      await insertLeadsSharingSortKeys(12);

      const { body: listed } = await getLeads();
      const { body: recalculated } = await postRecalculateAll();

      const ids = listed.map((lead) => lead.id);
      expect(ids).toHaveLength(12);
      expect(ids).toEqual([...ids].sort());
      expect(recalculated.map((lead) => lead.id)).toEqual(ids);
    });

    it('stamps every row with the same instant', async () => {
      // A bulk recalculation happened at ONE instant; per-row `new Date()`
      // would make the timestamps disagree about an event that did not.
      await createLead();
      await createLead('grace@example.com');

      const { body } = await postRecalculateAll();

      expect(new Set(body.map((lead) => lead.scoreCalculatedAt)).size).toBe(1);
    });

    it('answers 200 with an empty array when there is nothing to score', async () => {
      const { status, body } = await postRecalculateAll();

      expect(status).toBe(200);
      expect(body).toEqual([]);
    });
  });

  describe('GET /api/leads', () => {
    it('carries the score on every list row', async () => {
      // The `toLead` allowlist test. A column on the model is invisible to the
      // wire until somebody names it in the mapper, and nothing about skipping
      // that step is loud: the only symptom is `undefined` in the browser.
      const id = await createLead();
      await postScore(id);

      const { body } = await getLeads();

      expect(body).toHaveLength(1);
      expect(body[0]).toHaveProperty('activityScore', UNTOUCHED_SCORE);
      expect(body[0]).toHaveProperty('scoreCalculatedAt');
      expect(typeof body[0].activityScore).toBe('number');
    });

    it('carries null on both fields — present, not absent — before the first scoring', async () => {
      // Absent and null are different to a client: null means never scored,
      // which is a different fact from 0, and the list renders it as an
      // em-dash rather than an ice-cold badge.
      await createLead();

      const { body } = await getLeads();

      expect(body[0]).toHaveProperty('activityScore', null);
      expect(body[0]).toHaveProperty('scoreCalculatedAt', null);
    });
  });

  // Helpers below the tests: they are plumbing, not specification.

  function postScore(id: string) {
    return send<LeadResource>(request(http).post(`/api/leads/${id}/score`));
  }

  function postRecalculateAll() {
    return send<LeadResource[]>(
      request(http).post('/api/leads/scores/recalculate'),
    );
  }

  function getLead(id: string) {
    return send<LeadDetail>(request(http).get(`/api/leads/${id}`));
  }

  function getLeads() {
    return send<LeadResource[]>(request(http).get('/api/leads'));
  }

  async function createLead(email = VALID_LEAD.email): Promise<string> {
    const { body } = await send<LeadResource>(
      request(http)
        .post('/api/leads')
        .send({ ...VALID_LEAD, email }),
    );

    return body.id;
  }

  /**
   * Rows that tie on BOTH sort keys, which is what the seeder produces and
   * what no HTTP-created lead can reproduce. Raw SQL because the point is one
   * INSERT stamping one created_at across every row.
   */
  function insertLeadsSharingSortKeys(count: number): Promise<unknown> {
    return app.get(Sequelize).query(
      `INSERT INTO leads (first_name, last_name, email, status, inquiry_date, created_at, updated_at)
         SELECT 'Tied', 'Row', 'tied' || n || '@example.com', 'active',
                DATE '2026-06-05', now(), now()
           FROM generate_series(1, :count) AS n`,
      { replacements: { count } },
    );
  }

  /** Dated now by the column default, so it lands in both the recency and engagement windows. */
  function logInteraction(id: string) {
    const interaction: CreateInteractionRequest = {
      type: 'call',
      notes: 'Talked through the Littleton listings.',
    };

    return send<unknown>(
      request(http).post(`/api/leads/${id}/interactions`).send(interaction),
    );
  }
});

async function send<T>(
  pending: request.Test,
): Promise<{ status: number; body: T }> {
  const response = await pending;

  return { status: response.status, body: response.body as T };
}
