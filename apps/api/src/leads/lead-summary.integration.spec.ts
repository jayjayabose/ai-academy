import type {
  ApiError,
  CreateLeadRequest,
  Lead as LeadResource,
  LeadDetail,
  LeadSummary,
} from '@ai-academy/shared';
import type Anthropic from '@anthropic-ai/sdk';
import type { INestApplication } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Test } from '@nestjs/testing';
import { testDatabaseOptions, truncateAll } from '@test/helpers';
import { JwtAuthGuard } from '../auth/auth.contract';
import { RootConfigModule } from '../config/root-config';
import { Sequelize } from 'sequelize-typescript';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureApp } from '../common/configure-app';
import { InteractionsModule } from '../interactions/interactions.module';
import { ANTHROPIC_CLIENT } from '../summaries/anthropic-client';
import { LeadsModule } from './leads.module';

/**
 * POST /api/leads/:id/summary over real HTTP against real Postgres.
 *
 * ONE thing is stubbed: the Anthropic client, at the network boundary. Everything
 * else is real — the migrations built the schema, the CHECK constraints are live,
 * ValidationPipe and ParseUUIDPipe are the ones main.ts ships, and the exception
 * filter turns the service's exceptions into real status codes.
 *
 * The stub is not a shortcut. Calling the paid API from the suite would make it
 * non-hermetic (a refusal or a rate limit becomes a red build), flaky, and
 * expensive — and it would still not prove the summary is any GOOD, which is a
 * judgement no assertion makes. That question belongs to Gate 5's manual curl
 * run against the live API, which is why Gate 5 is mandatory rather than nice to
 * have.
 *
 * The most important test in this file is the list-rows one. The five summary
 * columns are on the Lead model, so Sequelize selects them on every query
 * including GET /api/leads; only the explicit mapper in lead-wire.ts keeps them
 * off the wire, and nothing about that failing would be loud.
 */

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

/** A syntactically valid UUID that is not in the database. */
const ABSENT_ID = '11111111-1111-4111-8111-111111111111';

/** Every field the wire `Lead` type declares — and, crucially, no others. */
const LEAD_KEYS = [
  'id',
  'firstName',
  'lastName',
  'email',
  'phone',
  'status',
  'budget',
  'location',
  'propertyType',
  'bedrooms',
  'source',
  'inquiryDate',
  'notes',
  'activityScore',
  'scoreCalculatedAt',
  'createdAt',
  'updatedAt',
];

describe('the lead summary endpoint', () => {
  let app: INestApplication;
  let http: App;
  let client: { apiKey: string | null; messages: { create: jest.Mock } };

  beforeAll(async () => {
    client = {
      apiKey: 'sk-ant-integration-stub',
      messages: { create: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        RootConfigModule,
        SequelizeModule.forRoot(testDatabaseOptions()),
        LeadsModule,
        InteractionsModule,
      ],
    })
      .overrideProvider(ANTHROPIC_CLIENT)
      .useValue(client)
      // Auth is covered by auth.integration.spec.ts (401 without a token, 200 with
      // one). This spec is about leads behaviour, so the global guard is bypassed.
      .overrideProvider(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    http = app.getHttpServer() as App;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateAll(app.get(Sequelize));
    client.apiKey = 'sk-ant-integration-stub';
    client.messages.create.mockReset();
    client.messages.create.mockResolvedValue(modelResponse());
  });

  describe('POST /api/leads/:id/summary', () => {
    it('answers 200 with all five fields', async () => {
      // 200 rather than 201: this recomputes a field of the lead, it does not
      // create a subordinate resource with an identity of its own.
      const id = await createLead();

      const { status, body } = await postSummary(id);

      expect(status).toBe(200);
      // Exactly five keys — the three the model authored plus the two the server
      // stamps. Nothing else leaks out of the row.
      expect(Object.keys(body).sort()).toEqual([
        'generatedAt',
        'model',
        'narrative',
        'nextAction',
        'urgency',
      ]);
      expect(body.narrative).toContain('Littleton');
      expect(body.nextAction).toContain('Call Ada');
      expect(body.urgency).toBe('high');
      expect(body.model).toBe('claude-opus-5');
      expect(body.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    });

    it('stamps generatedAt server-side, near now', async () => {
      const id = await createLead();

      const { body } = await postSummary(id);

      expect(new Date(body.generatedAt).getTime()).toBeGreaterThan(
        Date.now() - 60_000,
      );
    });

    it('writes the row, so a later GET does not need a second model call', async () => {
      const id = await createLead();
      const { body: generated } = await postSummary(id);

      const { body: detail } = await getLead(id);

      // The same generatedAt, to the millisecond: this is the stored row coming
      // back, not a fresh summary.
      expect(detail.summary).toEqual(generated);
      expect(client.messages.create).toHaveBeenCalledTimes(1);
    });

    it('replaces the previous summary when called again', async () => {
      const id = await createLead();
      const { body: first } = await postSummary(id);

      client.messages.create.mockResolvedValue(
        modelResponse({
          narrative: 'Second look at Ada.',
          nextAction: 'Email Ada the Belleview floor plan.',
          urgency: 'low',
        }),
      );
      const { body: second } = await postSummary(id);

      expect(second.urgency).toBe('low');
      expect(new Date(second.generatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(first.generatedAt).getTime(),
      );
      expect((await getLead(id)).body.summary).toEqual(second);
    });

    it('answers 404 for an id that is not there, without calling the model', async () => {
      const { status } = await send<ApiError>(
        request(http).post(`/api/leads/${ABSENT_ID}/summary`),
      );

      expect(status).toBe(404);
      // The lead is loaded first. Paying for a summary of a lead that does not
      // exist would be the expensive kind of bug.
      expect(client.messages.create).not.toHaveBeenCalled();
    });

    it('answers 400, not 500, for an id that is not a UUID', async () => {
      const { status } = await send<ApiError>(
        request(http).post('/api/leads/not-a-uuid/summary'),
      );

      expect(status).toBe(400);
    });

    it('answers 503 naming ANTHROPIC_API_KEY when the key is missing', async () => {
      // What a fresh clone looks like: the CRM boots and works, and only this
      // path fails — with a sentence that names the fix (Decision 5).
      client.apiKey = null;
      const id = await createLead();

      const { status, body } = await send<ApiError>(
        request(http).post(`/api/leads/${id}/summary`),
      );

      expect(status).toBe(503);
      expect(messages(body)).toMatch(/ANTHROPIC_API_KEY/);
    });
  });

  describe('GET /api/leads/:id', () => {
    it('answers with summary: null — present, not absent — before generation', async () => {
      // Absent and null are different to a client: `'summary' in detail` is how
      // the frontend can tell "never generated" from "old contract".
      const id = await createLead();

      const { body } = await getLead(id);

      expect(body).toHaveProperty('summary');
      expect(body.summary).toBeNull();
    });
  });

  describe('GET /api/leads', () => {
    it('leaks no summary field onto a list row, even after generation', async () => {
      // The one that matters. Sequelize selects all five columns on this query;
      // the wire `Lead` type has no room for them, and only the mapper enforces
      // that. Serialising the model instance directly would put summaryNarrative
      // and friends on every row with no error anywhere.
      const id = await createLead();
      await postSummary(id);

      const { body } = await send<LeadResource[]>(
        request(http).get('/api/leads'),
      );

      expect(body).toHaveLength(1);
      expect(Object.keys(body[0]).sort()).toEqual([...LEAD_KEYS].sort());
    });
  });

  // Helpers below the tests: they are plumbing, not specification.

  function postSummary(id: string) {
    return send<LeadSummary>(request(http).post(`/api/leads/${id}/summary`));
  }

  function getLead(id: string) {
    return send<LeadDetail>(request(http).get(`/api/leads/${id}`));
  }

  async function createLead(): Promise<string> {
    const { body } = await send<LeadResource>(
      request(http).post('/api/leads').send(VALID_LEAD),
    );

    return body.id;
  }
});

/** Only the fields SummariesService reads off a Message. */
function modelResponse(
  summary: Record<string, string> = {
    narrative:
      'Ada Lovelace is a qualified Littleton condo buyer with a $480,000 budget.',
    nextAction: 'Call Ada to confirm the balcony requirement.',
    urgency: 'high',
  },
): Anthropic.Message {
  return {
    model: 'claude-opus-5',
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: JSON.stringify(summary), citations: null }],
  } as Anthropic.Message;
}

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
