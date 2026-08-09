import Anthropic from '@anthropic-ai/sdk';
import type { LeadSummary } from '@ai-academy/shared';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Interaction } from '../interactions/interaction.model';
import type { Lead } from '../leads/lead.model';
import { SUMMARY_URGENCIES } from '../leads/summary-urgency';
import { ANTHROPIC_CLIENT } from './anthropic-client';
import { renderLead } from './render-lead';

/**
 * The three fields the model authors, plus the model id that produced them.
 * `generatedAt` is missing on purpose — the server stamps it, not the model, and
 * a model-supplied timestamp would be a fabrication.
 */
export type GeneratedSummary = Omit<LeadSummary, 'generatedAt'>;

const MODEL = 'claude-opus-5';

/**
 * Raw JSON Schema, not zod. This repo validates with class-validator, and adding
 * a second validation library for one object is not worth the dependency.
 *
 * `additionalProperties: false` plus all three `required` is what makes the
 * response shape a guarantee rather than a hope — with structured outputs the
 * API constrains generation to this schema, so the check in `parse()` below is a
 * backstop against truncation, not the primary defence.
 */
const LEAD_SUMMARY_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    narrative: {
      type: 'string',
      description:
        'Two or three sentences: who this lead is and where things stand.',
    },
    nextAction: {
      type: 'string',
      description: 'One concrete next step the salesperson can take today.',
    },
    urgency: {
      type: 'string',
      enum: [...SUMMARY_URGENCIES],
      description: 'How soon that next step should happen.',
    },
  },
  required: ['narrative', 'nextAction', 'urgency'],
  additionalProperties: false,
};

/**
 * Short and specific, and it stays that way. Prompts written for older models
 * over-specify — step-by-step scripts, banned-phrase lists, emphatic MUSTs — and
 * on a current model that reduces output quality rather than improving it. State
 * what the fields mean and what honesty requires; leave the writing to the model.
 */
const SYSTEM_PROMPT = `You are helping a real-estate salesperson pick up a lead they may not have touched in weeks.

You will be given one lead's details and its interaction history, newest first. Return:

- narrative: two or three sentences on who this lead is and where things actually stand.
- nextAction: one concrete step this salesperson can take today — a specific call, email, or piece of research, with enough detail that they know what to do without rereading the record. Not "follow up" or "continue to nurture the relationship".
- urgency: how soon nextAction should happen, judged from the history and the lead's status.

Some records are thin: no interactions, most fields unknown. Say so plainly and base the next action on getting the missing information. Do not invent conversations, preferences, or timelines that are not in the record.`;

const MISSING_KEY_MESSAGE =
  'ANTHROPIC_API_KEY is not set; lead summaries are unavailable without it.';

@Injectable()
export class SummariesService {
  private readonly logger = new Logger(SummariesService.name);

  /**
   * Lead id -> the model call already in flight for it.
   *
   * Two tabs, a double-click, or an impatient reload fires two concurrent POSTs
   * for the same lead. Without this that is two model calls, two writes, and
   * double the spend for one summary. The second caller awaits the first's
   * promise and they both get the same answer.
   *
   * In-process only, which is the honest scope: it collapses the duplicate a
   * single browser produces, not a race between two API instances. Doing that
   * properly needs a row lock, and the cost of losing the race is one wasted
   * call, not a corrupt row — `leads_summary_complete_check` sees to that.
   */
  private readonly inFlight = new Map<string, Promise<GeneratedSummary>>();

  constructor(@Inject(ANTHROPIC_CLIENT) private readonly client: Anthropic) {}

  /**
   * Summarises one lead. Does NOT touch the database — persistence is
   * LeadsService's job, so this stays a pure function of its inputs plus one
   * network call.
   */
  async generate(
    lead: Lead,
    interactions: Interaction[],
  ): Promise<GeneratedSummary> {
    // Checked here rather than left to the SDK's AuthenticationError, so the
    // failure names the variable and the fix (Decision 5). Reading it off the
    // client rather than process.env keeps one source of truth: this is the
    // credential the request would actually have used.
    if (!this.client.apiKey) {
      throw new ServiceUnavailableException(MISSING_KEY_MESSAGE);
    }

    const existing = this.inFlight.get(lead.id);

    if (existing) {
      return existing;
    }

    const pending = this.callModel(lead, interactions).finally(() => {
      this.inFlight.delete(lead.id);
    });

    this.inFlight.set(lead.id, pending);

    return pending;
  }

  private async callModel(
    lead: Lead,
    interactions: Interaction[],
  ): Promise<GeneratedSummary> {
    let response: Anthropic.Message;

    try {
      response = await this.client.messages.create({
        model: MODEL,
        // Caps thinking PLUS response text, and thinking is on by default on
        // this model. Shrinking it does not shorten the summary; it truncates
        // mid-JSON and the parse below turns that into a 502.
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: renderLead(lead, interactions) }],
        // Both `effort` and `format` live in here, not at the top level.
        // `low` because this is a short summarisation of one small record, and
        // effort is the dominant cost and latency lever on this model.
        output_config: {
          effort: 'low',
          format: { type: 'json_schema', schema: LEAD_SUMMARY_SCHEMA },
        },
        // No temperature/top_p/top_k: removed on this model, and sending one is
        // a 400.
      });
    } catch (error) {
      throw this.asHttpException(error);
    }

    // HTTP 200 with empty content. Reading response.content[0] first would crash
    // with a TypeError and surface as a 500 that says nothing.
    if (response.stop_reason === 'refusal') {
      throw new ServiceUnavailableException(
        'The model declined to summarise this lead.',
      );
    }

    return { ...this.parse(response), model: response.model };
  }

  /** The JSON the model produced, checked before it is trusted. */
  private parse(response: Anthropic.Message): Omit<GeneratedSummary, 'model'> {
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const parsed: unknown = tryParseJson(text);

    if (!isGeneratedSummary(parsed)) {
      // The raw text is the only way to tell a truncation apart from a schema
      // surprise, and it is the lead's own data — no credential passes through
      // here to leak.
      this.logger.error(
        `Unusable summary for lead: stop_reason=${response.stop_reason ?? 'null'} raw=${text}`,
      );

      throw new HttpException(
        'The model returned an unusable summary.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return parsed;
  }

  /**
   * SDK error -> HTTP status, on the typed classes only. String-matching a
   * message is how this kind of mapping rots: the messages are not a contract
   * and the classes are.
   */
  private asHttpException(error: unknown): HttpException {
    if (error instanceof Anthropic.RateLimitError) {
      return new HttpException(
        'The summarisation service is rate limited. Try again shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // APIConnectionTimeoutError extends APIConnectionError, so the 60s timeout
    // lands here too.
    if (
      error instanceof Anthropic.APIConnectionError ||
      error instanceof Anthropic.InternalServerError
    ) {
      return new ServiceUnavailableException(
        'The summarisation service is unavailable. Try again shortly.',
      );
    }

    // Anything else the SDK typed — a 401 from a key that is present but wrong,
    // a 400 from a request this code built badly. Upstream said no for a reason
    // the client cannot act on, which is what 502 means.
    if (error instanceof Anthropic.APIError) {
      this.logger.error(`Anthropic API error: ${error.message}`);

      return new HttpException(
        'The summarisation service rejected the request.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    // Not an SDK error at all: a bug in this file. Let it surface as a 500
    // rather than be dressed up as an upstream problem.
    throw error;
  }
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isGeneratedSummary(
  value: unknown,
): value is Omit<GeneratedSummary, 'model'> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const { narrative, nextAction, urgency } = value as Record<string, unknown>;

  return (
    isNonEmptyString(narrative) &&
    isNonEmptyString(nextAction) &&
    typeof urgency === 'string' &&
    (SUMMARY_URGENCIES as readonly string[]).includes(urgency)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
