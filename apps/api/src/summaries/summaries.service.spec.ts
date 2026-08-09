import type Anthropic from '@anthropic-ai/sdk';
import {
  APIConnectionError,
  AuthenticationError,
  InternalServerError,
  RateLimitError,
} from '@anthropic-ai/sdk';
import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { buildInteraction, buildLead } from '@test/helpers/build-models';
import { ANTHROPIC_CLIENT } from './anthropic-client';
import { SummariesService } from './summaries.service';

/**
 * Unit tier: the Anthropic client is a mock, so this runs with Docker stopped and
 * spends nothing.
 *
 * The mock is the NETWORK BOUNDARY and nothing else — the request this service
 * builds, the parsing, the error mapping and the dedupe are all real. What cannot
 * be proved here is whether the model produces a GOOD summary; only Gate 5 can
 * answer that, which is why Gate 5 is not optional.
 */

/** A stubbed `messages.create`, typed so the recorded call arguments are too. */
type CreateMock = jest.Mock<
  Promise<Anthropic.Message>,
  [Anthropic.MessageCreateParamsNonStreaming]
>;

const VALID_JSON = JSON.stringify({
  narrative:
    'Ada Lovelace is a qualified Littleton condo buyer with a $480,000 budget. She toured two listings in July and has not been contacted since.',
  nextAction:
    'Call Ada to ask whether the south-facing balcony requirement rules out the Belleview unit.',
  urgency: 'high',
});

describe('the lead summariser', () => {
  let service: SummariesService;
  let create: CreateMock;

  beforeEach(async () => {
    create = createMock();
    create.mockResolvedValue(modelResponse(VALID_JSON));
    service = await build({ apiKey: 'sk-ant-test', create });
  });

  describe('on the happy path', () => {
    it('returns the three model fields plus the model that produced them', async () => {
      const summary = await service.generate(buildLead(), [buildInteraction()]);

      expect(summary.narrative).toContain('Littleton');
      expect(summary.nextAction).toContain('Call Ada');
      expect(summary.urgency).toBe('high');
      expect(summary.model).toBe('claude-opus-5');
    });

    it('reports the model the RESPONSE names, not the one we asked for', async () => {
      // Provenance has to be what actually answered. If the API ever serves a
      // different model than requested, the stored `model` should say so.
      create.mockResolvedValue(
        modelResponse(VALID_JSON, { model: 'claude-opus-5-served' }),
      );

      const summary = await service.generate(buildLead(), []);

      expect(summary.model).toBe('claude-opus-5-served');
    });

    it('sends the request shape this model requires', async () => {
      // Pinned deliberately. Every one of these is a documented trap: effort and
      // format live INSIDE output_config, max_tokens caps thinking as well as
      // text (and thinking is on by default here), and temperature/top_p/top_k
      // are a 400 on this model.
      await service.generate(buildLead(), []);

      const request = createArgument();

      expect(request.model).toBe('claude-opus-5');
      expect(request.max_tokens).toBe(4096);
      expect(request.output_config?.effort).toBe('low');
      expect(request.output_config?.format?.type).toBe('json_schema');
      expect(request).not.toHaveProperty('temperature');
      expect(request).not.toHaveProperty('top_p');
      expect(request).not.toHaveProperty('top_k');
      expect(request).not.toHaveProperty('thinking');
    });

    it('sends a closed schema that pins the urgency value set', async () => {
      // Without this the runtime array and the CHECK constraint are the only
      // things standing between the model and a 500.
      await service.generate(buildLead(), []);

      const schema = sentSchema();

      expect(schema.additionalProperties).toBe(false);
      expect(schema.required).toEqual(['narrative', 'nextAction', 'urgency']);
      expect(schema.properties?.urgency?.enum).toEqual([
        'low',
        'medium',
        'high',
      ]);
    });
  });

  describe('when the model declines the request', () => {
    beforeEach(() => {
      // HTTP 200 with `stop_reason: refusal` and empty content. Reading
      // content[0] first would be a TypeError and a 500 saying nothing.
      create.mockResolvedValue(
        modelResponse('', { stop_reason: 'refusal', content: [] }),
      );
    });

    it('answers 503 and says the model declined', async () => {
      const error = await rejection(service.generate(buildLead(), []));

      expect(error.getStatus()).toBe(503);
      expect(error.message).toMatch(/declined/);
    });
  });

  describe('when the response is not usable', () => {
    it.each([
      { name: 'content that is not JSON', text: 'I would rather not, thanks.' },
      {
        name: 'JSON missing a field',
        text: JSON.stringify({ narrative: 'a', urgency: 'low' }),
      },
      {
        // The schema should make this impossible. If it ever happens it must not
        // reach the CHECK constraint and come back as a 500.
        name: 'an urgency outside the value set',
        text: JSON.stringify({
          narrative: 'a',
          nextAction: 'b',
          urgency: 'catastrophic',
        }),
      },
      {
        // What hitting max_tokens looks like from here: valid prose, invalid JSON.
        name: 'a truncated response',
        text: '{"narrative": "Ada Lovelace is a qual',
      },
    ])('answers 502 for $name', async ({ text }) => {
      create.mockResolvedValue(modelResponse(text));

      const error = await rejection(service.generate(buildLead(), []));

      expect(error.getStatus()).toBe(502);
    });
  });

  describe('when the API key is missing', () => {
    beforeEach(async () => {
      // What the SDK leaves behind when ANTHROPIC_API_KEY is unset: apiKey is
      // null and the constructor does not complain, so the app boots fine and
      // only this path fails.
      service = await build({ apiKey: null, create });
    });

    it('names the variable and says summaries are unavailable', async () => {
      const error = await rejection(service.generate(buildLead(), []));

      expect(error.getStatus()).toBe(503);
      expect(error.message).toMatch(/ANTHROPIC_API_KEY/);
    });

    it('does not call the API at all', async () => {
      await rejection(service.generate(buildLead(), []));

      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('mapping the SDK errors', () => {
    it.each([
      {
        name: 'a rate limit',
        error: new RateLimitError(429, undefined, 'slow down', new Headers()),
        status: 429,
      },
      {
        name: 'a connection failure or timeout',
        error: new APIConnectionError({ message: 'ECONNRESET' }),
        status: 503,
      },
      {
        name: 'a 500 from upstream',
        error: new InternalServerError(500, undefined, 'boom', new Headers()),
        status: 503,
      },
      {
        // The key was present, so the pre-flight check passed — it is just
        // wrong. Nothing the client can do about it, which is what 502 means.
        name: 'a key that is present but rejected',
        error: new AuthenticationError(
          401,
          undefined,
          'invalid x-api-key',
          new Headers(),
        ),
        status: 502,
      },
    ])('turns $name into a $status', async ({ error, status }) => {
      create.mockRejectedValue(error);

      expect(
        (await rejection(service.generate(buildLead(), []))).getStatus(),
      ).toBe(status);
    });

    it('lets a bug in this service surface as a 500 rather than blaming upstream', async () => {
      create.mockRejectedValue(new TypeError('cannot read properties of null'));

      await expect(service.generate(buildLead(), [])).rejects.toThrow(
        TypeError,
      );
    });
  });

  describe('deduplicating concurrent requests for one lead', () => {
    // Two tabs, a double-click, or an impatient reload. Without the in-flight
    // map that is two model calls and double the spend for one summary.
    it('makes ONE call and hands both callers the same answer', async () => {
      const inFlight = defer<Anthropic.Message>();
      create.mockReturnValue(inFlight.promise);
      const lead = buildLead();

      const first = service.generate(lead, []);
      const second = service.generate(lead, []);
      inFlight.resolve(modelResponse(VALID_JSON));

      expect(await first).toEqual(await second);
      expect(create).toHaveBeenCalledTimes(1);
    });

    it('keeps different leads independent', async () => {
      const inFlight = defer<Anthropic.Message>();
      create.mockReturnValue(inFlight.promise);

      const first = service.generate(buildLead({ id: LEAD_A }), []);
      const second = service.generate(buildLead({ id: LEAD_B }), []);
      inFlight.resolve(modelResponse(VALID_JSON));
      await Promise.all([first, second]);

      expect(create).toHaveBeenCalledTimes(2);
    });

    it('clears the entry once settled, so the next request regenerates', async () => {
      const lead = buildLead();

      await service.generate(lead, []);
      await service.generate(lead, []);

      expect(create).toHaveBeenCalledTimes(2);
    });

    it('clears the entry after a FAILURE too, rather than caching the error', async () => {
      // The `finally` is what makes this true. Without it one transient 503
      // would wedge that lead until the process restarted.
      const lead = buildLead();
      create.mockRejectedValueOnce(
        new APIConnectionError({ message: 'ECONNRESET' }),
      );

      expect((await rejection(service.generate(lead, []))).getStatus()).toBe(
        503,
      );
      expect((await service.generate(lead, [])).urgency).toBe('high');
    });
  });

  // Helpers below the tests: they are plumbing, not specification.

  function createArgument(): Anthropic.MessageCreateParamsNonStreaming {
    return create.mock.calls[0][0];
  }

  /**
   * The JSON Schema actually sent. `JSONOutputFormat.schema` is typed as an open
   * bag of `unknown`, so the parts under assertion are named here rather than
   * indexed into blind.
   */
  function sentSchema(): {
    additionalProperties?: unknown;
    required?: unknown;
    properties?: { urgency?: { enum?: unknown } };
  } {
    return createArgument().output_config?.format?.schema ?? {};
  }
});

/** `jest.fn()` alone is `Mock<any, any>`; the type arguments are what make the recorded call arguments checkable. */
function createMock(): CreateMock {
  return jest.fn<
    Promise<Anthropic.Message>,
    [Anthropic.MessageCreateParamsNonStreaming]
  >();
}

const LEAD_A = '9b0b8e2a-0000-4000-8000-00000000000a';
const LEAD_B = '9b0b8e2a-0000-4000-8000-00000000000b';

async function build(client: {
  apiKey: string | null;
  create: CreateMock;
}): Promise<SummariesService> {
  const module = await Test.createTestingModule({
    providers: [
      SummariesService,
      {
        provide: ANTHROPIC_CLIENT,
        useValue: {
          apiKey: client.apiKey,
          messages: { create: client.create },
        },
      },
    ],
  }).compile();

  return module.get(SummariesService);
}

/**
 * Only the fields the service reads. `usage`, ids and the rest of the Message
 * shape are irrelevant here, and filling them in would bury what each test is
 * actually varying.
 */
function modelResponse(
  text: string,
  overrides: Partial<Anthropic.Message> = {},
): Anthropic.Message {
  return {
    model: 'claude-opus-5',
    stop_reason: 'end_turn',
    content: [{ type: 'text', text, citations: null }],
    ...overrides,
  } as Anthropic.Message;
}

/**
 * The HttpException a call rejected with.
 *
 * Preferred over `rejects.toMatchObject({ status })` because that reads
 * `expect.stringContaining` and friends back as `any`; this keeps the assertions
 * on a typed exception, so `getStatus()` and `message` are checked rather than
 * guessed at. A rejection that is NOT an HttpException is rethrown — those are
 * bugs, not mapped failures, and this must not swallow them.
 */
async function rejection(pending: Promise<unknown>): Promise<HttpException> {
  try {
    await pending;
  } catch (error) {
    if (error instanceof HttpException) {
      return error;
    }

    throw error;
  }

  throw new Error('Expected the call to reject, but it resolved.');
}

/** A promise held open, so two calls can genuinely overlap. */
function defer<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let settle: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    settle = resolve;
  });

  return { promise, resolve: (value) => settle(value) };
}
