import type {
  ApiError,
  CreateInteractionRequest,
  CreateLeadRequest,
  Interaction as InteractionResource,
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
import { Interaction } from '../interactions/interaction.model';
import { InteractionsModule } from '../interactions/interactions.module';
import { LeadsModule } from './leads.module';

/**
 * The endpoints over real HTTP against real Postgres.
 *
 * This is the first thing in the repo that exercises the pieces only a running
 * app has: the global ValidationPipe, ParseUUIDPipe, the exception filter turning
 * NotFoundException into a 404 body, and JSON serialisation of model instances.
 * None of it is reachable from a service-level test.
 *
 * The app is built with configureApp(), the same function main.ts calls — a test
 * that constructed its own ValidationPipe could pass while the shipped
 * configuration differed.
 *
 * Response bodies are read through `send<T>()` using the types from
 * packages/shared. supertest types `body` as `any`, which would silently defeat
 * every type check in the file; naming the expected shape makes a response that
 * stops matching the wire contract a compile error rather than a runtime
 * surprise.
 */

const VALID_LEAD: CreateLeadRequest = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '(303) 555-0193',
  status: 'qualified',
  budget: 480000,
  location: 'Littleton',
  propertyType: 'condo',
  bedrooms: 2,
  source: 'website',
  inquiryDate: '2026-06-05',
  notes: 'Wants a south-facing balcony.',
};

/** A syntactically valid UUID that is not in the database. */
const ABSENT_ID = '11111111-1111-4111-8111-111111111111';

describe('the leads endpoints', () => {
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

  describe('POST /api/leads', () => {
    it('answers 201 with the stored lead', async () => {
      const { status, body } = await postLead(VALID_LEAD);

      expect(status).toBe(201);
      expect(body).toMatchObject(VALID_LEAD);
      expect(typeof body.id).toBe('string');
    });

    it('serialises the row the way the wire contract promises', async () => {
      const { body } = await postLead(VALID_LEAD);

      // Timestamps as ISO strings, inquiryDate as a bare date, budget as a real
      // number. The last one is why the column is INTEGER: NUMERIC and BIGINT
      // come back from the pg driver as strings, which would make the contract a
      // lie at runtime with no error anywhere.
      expect(body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
      expect(body.inquiryDate).toBe('2026-06-05');
      expect(typeof body.budget).toBe('number');
    });

    it('lowercases the email on write', async () => {
      const { body } = await postLead({
        ...VALID_LEAD,
        email: '  Ada.Lovelace@Example.COM ',
      });

      expect(body.email).toBe('ada.lovelace@example.com');
    });

    it('falls back to the defaults for status and inquiryDate', async () => {
      const { status, body } = await postLead(identityOnly());

      expect(status).toBe(201);
      expect(body.status).toBe('active');
      expect(body.inquiryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('leaves the fields a salesperson may not know yet as null', async () => {
      const { body } = await postLead(identityOnly());

      expect(body).toMatchObject({
        phone: null,
        budget: null,
        location: null,
        propertyType: null,
        bedrooms: null,
        source: null,
        notes: null,
      });
    });

    describe('rejecting bad input', () => {
      it('names every failing field at once', async () => {
        const { status, body } = await postExpectingError({
          firstName: '',
          lastName: 'Lovelace',
          email: 'not-an-email',
        });

        expect(status).toBe(400);
        // ApiError.message is an array for validation failures; the frontend
        // renders one line per entry (core/api-error.ts:25).
        expect(Array.isArray(body.message)).toBe(true);
        expect(messages(body)).toMatch(/firstName/);
        expect(messages(body)).toMatch(/email/);
      });

      it('rejects an unknown property rather than dropping it', async () => {
        // forbidNonWhitelisted. Trap #9: this is why the Angular client builds
        // PATCH bodies field by field instead of spreading a fetched entity.
        const { status, body } = await postExpectingError({
          ...VALID_LEAD,
          activityScore: 42,
        });

        expect(status).toBe(400);
        expect(messages(body)).toMatch(/activityScore should not exist/);
      });

      it('rejects a budget above the ceiling', async () => {
        const { status } = await postExpectingError({
          ...VALID_LEAD,
          budget: 100_000_001,
        });

        expect(status).toBe(400);
      });

      it('rejects a status outside the union', async () => {
        const { status } = await postExpectingError({
          ...VALID_LEAD,
          status: 'archived',
        });

        expect(status).toBe(400);
      });
    });

    describe('the two-case optional rule', () => {
      // The hole notes/day_01_contract.md:140-152 exists to close, and the reason
      // UpdateLeadDto is not PartialType(CreateLeadDto). Under @IsOptional() every
      // case below would validate clean, reach a NOT NULL column, and come back as
      // a 500 or a raw 23502.

      it.each(['status', 'inquiryDate', 'firstName', 'email'])(
        'answers 400 for an explicit null on the NOT NULL field %s',
        async (field) => {
          const { status } = await postExpectingError({
            ...VALID_LEAD,
            [field]: null,
          });

          expect(status).toBe(400);
        },
      );

      it.each([
        'phone',
        'budget',
        'location',
        'propertyType',
        'bedrooms',
        'source',
        'notes',
      ])('accepts an explicit null on the nullable field %s', async (field) => {
        const { status, body } = await send<Record<string, unknown>>(
          request(http)
            .post('/api/leads')
            .send({ ...VALID_LEAD, [field]: null }),
        );

        expect(status).toBe(201);
        expect(body[field]).toBeNull();
      });
    });
  });

  describe('GET /api/leads', () => {
    it('answers with an empty array rather than a 404 when there are none', async () => {
      const { status, body } = await send<LeadResource[]>(
        request(http).get('/api/leads'),
      );

      expect(status).toBe(200);
      expect(body).toEqual([]);
    });

    it('returns full rows without interactions — that is what the detail route is for', async () => {
      const id = await createLead();
      await postInteraction(id, { type: 'call' });

      const { body } = await send<LeadResource[]>(
        request(http).get('/api/leads'),
      );

      expect(body).toHaveLength(1);
      expect(body[0]).not.toHaveProperty('interactions');
    });

    it('orders newest inquiry first, so the list does not reshuffle between requests', async () => {
      await createLead({ inquiryDate: '2026-01-15' });
      await createLead({ inquiryDate: '2026-07-20' });
      await createLead({ inquiryDate: '2026-04-02' });

      const { body } = await send<LeadResource[]>(
        request(http).get('/api/leads'),
      );

      expect(body.map((lead) => lead.inquiryDate)).toEqual([
        '2026-07-20',
        '2026-04-02',
        '2026-01-15',
      ]);
    });
  });

  describe('GET /api/leads/:id', () => {
    it('embeds the interactions, newest first', async () => {
      const id = await createLead();

      for (const occurredAt of [
        '2026-07-01T10:00:00.000Z',
        '2026-08-01T10:00:00.000Z',
        '2026-06-01T10:00:00.000Z',
      ]) {
        await postInteraction(id, { type: 'call', occurredAt });
      }

      const { status, body } = await send<LeadDetail>(
        request(http).get(`/api/leads/${id}`),
      );

      expect(status).toBe(200);
      expect(
        body.interactions.map((interaction) => interaction.occurredAt),
      ).toEqual([
        '2026-08-01T10:00:00.000Z',
        '2026-07-01T10:00:00.000Z',
        '2026-06-01T10:00:00.000Z',
      ]);
    });

    it('answers with an empty array for a lead that has no history', async () => {
      const id = await createLead();

      const { body } = await send<LeadDetail>(
        request(http).get(`/api/leads/${id}`),
      );

      expect(body.interactions).toEqual([]);
    });

    it('answers 404 for an id that is not there', async () => {
      const { status } = await send<ApiError>(
        request(http).get(`/api/leads/${ABSENT_ID}`),
      );

      expect(status).toBe(404);
    });

    it('answers 400, not 500, for an id that is not a UUID', async () => {
      // Without ParseUUIDPipe this reaches Postgres and returns a 500 wrapping
      // `22P02 invalid input syntax for type uuid`. The frontend treats anything
      // that is not a 404 as "the server is broken" (core/api-error.ts:44).
      const { status } = await send<ApiError>(
        request(http).get('/api/leads/not-a-uuid'),
      );

      expect(status).toBe(400);
    });
  });

  describe('PATCH /api/leads/:id', () => {
    it('applies only the fields sent', async () => {
      const id = await createLead();

      const { status, body } = await send<LeadResource>(
        request(http).patch(`/api/leads/${id}`).send({ status: 'closed' }),
      );

      expect(status).toBe(200);
      expect(body).toMatchObject({
        status: 'closed',
        firstName: 'Ada',
        budget: 480000,
      });
    });

    it('clears a nullable field when sent an explicit null', async () => {
      // `{ budget: null }` clears; `{}` leaves alone. That distinction survives
      // only because the nullable fields carry @IsOptional().
      const id = await createLead();

      const { body } = await send<LeadResource>(
        request(http).patch(`/api/leads/${id}`).send({ budget: null }),
      );

      expect(body.budget).toBeNull();
    });

    it('treats an empty body as a no-op rather than an error', async () => {
      const id = await createLead();

      const { status, body } = await send<LeadResource>(
        request(http).patch(`/api/leads/${id}`).send({}),
      );

      expect(status).toBe(200);
      expect(body).toMatchObject({ firstName: 'Ada', status: 'qualified' });
    });

    it('answers 400 for an explicit null on a NOT NULL field', async () => {
      const id = await createLead();

      const { status } = await send<ApiError>(
        request(http).patch(`/api/leads/${id}`).send({ status: null }),
      );

      expect(status).toBe(400);
    });

    it('answers 400 when a fetched entity is spread back in', async () => {
      // Trap #9 reproduced exactly: id, createdAt and updatedAt are not on
      // UpdateLeadRequest, so forbidNonWhitelisted rejects them.
      const id = await createLead();
      const { body: fetched } = await send<LeadDetail>(
        request(http).get(`/api/leads/${id}`),
      );

      const { status, body } = await send<ApiError>(
        request(http)
          .patch(`/api/leads/${id}`)
          .send({ ...fetched, status: 'closed' }),
      );

      expect(status).toBe(400);
      expect(messages(body)).toMatch(/id should not exist/);
    });

    it('answers 404 for an id that is not there', async () => {
      const { status } = await send<ApiError>(
        request(http)
          .patch(`/api/leads/${ABSENT_ID}`)
          .send({ status: 'closed' }),
      );

      expect(status).toBe(404);
    });
  });

  describe('DELETE /api/leads/:id', () => {
    it('answers 204 with no body', async () => {
      const id = await createLead();

      const response = await request(http).delete(`/api/leads/${id}`);

      expect(response.status).toBe(204);
      expect(response.text).toBe('');
    });

    it('takes the interactions with it', async () => {
      const id = await createLead();
      await postInteraction(id, { type: 'call' });

      await request(http).delete(`/api/leads/${id}`);

      // ON DELETE CASCADE in migration 001. Nothing in the application code
      // deletes interactions, so this is the schema being load-bearing.
      expect(await Interaction.count()).toBe(0);
    });

    it('answers 404 for an id that is not there', async () => {
      const { status } = await send<ApiError>(
        request(http).delete(`/api/leads/${ABSENT_ID}`),
      );

      expect(status).toBe(404);
    });
  });

  describe('POST /api/leads/:leadId/interactions', () => {
    it('answers 201 with the stored interaction', async () => {
      const leadId = await createLead();

      const { status, body } = await postInteraction(leadId, {
        type: 'meeting',
        occurredAt: '2026-07-04T12:00:00.000Z',
        notes: 'Toured two.',
      });

      expect(status).toBe(201);
      expect(body).toMatchObject({
        leadId,
        type: 'meeting',
        occurredAt: '2026-07-04T12:00:00.000Z',
        notes: 'Toured two.',
      });
    });

    it('defaults occurredAt to now when it is left out', async () => {
      const leadId = await createLead();

      const { status, body } = await postInteraction(leadId, { type: 'note' });

      expect(status).toBe(201);
      expect(new Date(body.occurredAt).getTime()).toBeGreaterThan(
        Date.now() - 60_000,
      );
    });

    it('answers 400 for an explicit null on occurredAt, which is NOT NULL', async () => {
      const leadId = await createLead();

      const { status } = await send<ApiError>(
        request(http)
          .post(`/api/leads/${leadId}/interactions`)
          .send({ type: 'note', occurredAt: null }),
      );

      expect(status).toBe(400);
    });

    it('answers 400 for a type outside the union', async () => {
      const leadId = await createLead();

      const { status } = await send<ApiError>(
        request(http)
          .post(`/api/leads/${leadId}/interactions`)
          .send({ type: 'carrier-pigeon' }),
      );

      expect(status).toBe(400);
    });

    it('answers 404, not a foreign-key 500, when the lead does not exist', async () => {
      const { status } = await send<ApiError>(
        request(http)
          .post(`/api/leads/${ABSENT_ID}/interactions`)
          .send({ type: 'call' }),
      );

      expect(status).toBe(404);
    });
  });

  // Helpers below the tests: they are plumbing, not specification.

  function postLead(payload: object) {
    return send<LeadResource>(request(http).post('/api/leads').send(payload));
  }

  function postExpectingError(payload: object) {
    return send<ApiError>(request(http).post('/api/leads').send(payload));
  }

  function postInteraction(leadId: string, payload: CreateInteractionRequest) {
    return send<InteractionResource>(
      request(http).post(`/api/leads/${leadId}/interactions`).send(payload),
    );
  }

  async function createLead(
    overrides: Partial<CreateLeadRequest> = {},
  ): Promise<string> {
    const { body } = await postLead({ ...VALID_LEAD, ...overrides });

    return body.id;
  }
});

async function send<T>(
  pending: request.Test,
): Promise<{ status: number; body: T }> {
  const response = await pending;

  return { status: response.status, body: response.body as T };
}

/** ApiError.message is `string | string[]`; flatten it so a test can just match a pattern. */
function messages(error: ApiError): string {
  return Array.isArray(error.message) ? error.message.join(' ') : error.message;
}

/** Only the three fields a lead cannot be created without. */
function identityOnly(): CreateLeadRequest {
  const { firstName, lastName, email } = VALID_LEAD;

  return { firstName, lastName, email };
}
