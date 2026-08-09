import type { SummaryUrgency } from '@ai-academy/shared';

/**
 * Runtime mirror of the SummaryUrgency union. See lead-status.ts for the full
 * argument; the short version is that `packages/shared` is types-only (D6/Trap
 * #7) and Sequelize's `validate.isIn` needs a real array.
 *
 * `satisfies` alone is NOT sufficient — it only checks that each element IS a
 * member, so a *subset* passes silently. The `Exclude` assertion catches
 * omissions in the other direction. Both halves are required.
 */

type AssertEmpty<T extends never> = T;

export const SUMMARY_URGENCIES = [
  'low',
  'medium',
  'high',
] as const satisfies readonly SummaryUrgency[];

// Fails to compile if a SummaryUrgency member is missing from the array above.
export type _SummaryUrgencyExhaustive = AssertEmpty<
  Exclude<SummaryUrgency, (typeof SUMMARY_URGENCIES)[number]>
>;
