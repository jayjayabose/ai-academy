import type { InteractionType } from '@ai-academy/shared';

/**
 * Runtime mirror of the shared `InteractionType` union — see the sibling file
 * apps/api/src/leads/lead-status.ts for the full rationale.
 *
 * `satisfies` alone is insufficient: it only checks that each element IS a
 * member, so a subset passes silently. The `Exclude` assertion catches
 * omissions in the other direction.
 */

type AssertEmpty<T extends never> = T;

export const INTERACTION_TYPES = [
  'call',
  'email',
  'meeting',
  'note',
] as const satisfies readonly InteractionType[];

export type _InteractionTypeExhaustive = AssertEmpty<
  Exclude<InteractionType, (typeof INTERACTION_TYPES)[number]>
>;
