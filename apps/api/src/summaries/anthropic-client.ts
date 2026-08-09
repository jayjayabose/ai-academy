import Anthropic from '@anthropic-ai/sdk';

/**
 * DI token for the Anthropic client.
 *
 * The client is a provider rather than a field initialised inside
 * SummariesService, for one reason: it is the network boundary, and it is the
 * only thing the tests are allowed to replace. The unit tests hand over a double
 * to count calls; the integration suite hands over a double so the suite stays
 * hermetic and free. Everything else in both tiers is real.
 */
export const ANTHROPIC_CLIENT = Symbol('ANTHROPIC_CLIENT');

/**
 * Zero-arg apart from these two options: the SDK reads ANTHROPIC_API_KEY from
 * the environment, and leaves `apiKey` as null when it is absent rather than
 * throwing — so a fresh clone without a key still boots (Decision 5 puts the
 * loud failure on the summarize path instead, where it can name the fix).
 *
 * `timeout` is in MILLISECONDS in the TypeScript SDK (Python's is seconds). The
 * default is 10 minutes, which is absurd for a request a browser is waiting on.
 */
export function createAnthropicClient(): Anthropic {
  return new Anthropic({ timeout: 60_000, maxRetries: 2 });
}
