import type { SummaryUrgency } from '@ai-academy/shared';

/**
 * Runtime mirror of the `SummaryUrgency` union — the frontend copy, duplicating
 * apps/api/src/leads/summary-urgency.ts for the reasons set out at the top of
 * lead-status.ts (peer workspaces, and `packages/shared` is types-only by D6).
 *
 * Its own file rather than a fifth value set in lead-status.ts, whose comment
 * argues for keeping one home for these: urgency is not a field of a lead, it is
 * the model's read of one, and it arrives on a different endpoint. The API drew
 * the same line, so the two trees stay symmetrical.
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

/**
 * Badge text for the summary card.
 *
 * `Record<SummaryUrgency, string>` is what makes a new union member a compile
 * error here rather than a blank badge in the UI — the map is not indexed
 * dynamically anywhere, so a missing key could not be caught at runtime.
 */
export const SUMMARY_URGENCY_LABELS: Readonly<Record<SummaryUrgency, string>> = {
  low: 'Low urgency',
  medium: 'Medium urgency',
  high: 'High urgency',
};
