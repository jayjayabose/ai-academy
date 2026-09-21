import type { LeadStatus } from '@ai-academy/shared';

/**
 * How hot a lead is, 0-100, from four inputs: recency, engagement, budget and
 * status.
 *
 * Deterministic arithmetic, not an LLM call (execution plan, Decision 1). The
 * four named inputs are numbers and dates; a pure function over them is
 * testable to the exact integer, costs nothing to recompute, and makes the
 * WEIGHTS the reviewable artefact rather than a prompt. You can read the tables
 * below and disagree with a number, which is not true of a paragraph of English
 * sent to a model.
 *
 * Bands rather than a continuous decay curve, for the same reason. A decay
 * function hides the same product decisions inside a constant nobody can argue
 * with.
 *
 * `now` is a PARAMETER, exactly as `generateInteractions` takes one. No
 * `new Date()` in here, no I/O, no Nest decorators. That is what lets the unit
 * tier pin every band boundary to the day with Docker stopped, and what lets
 * the seeder reuse this with its own injected `now` so seeded data stays
 * deterministic.
 *
 * The component maxima sum to exactly 100, so the result is in range BY
 * CONSTRUCTION and nothing here clamps it. A clamp would quietly absorb a
 * mis-weighted edit; instead the sum is asserted in the spec, and
 * `leads_activity_score_range_check` refuses the row if it ever slips past.
 */

/**
 * The shapes the formula reads, declared structurally rather than as
 * `Pick<Lead, ...>` of the Sequelize model.
 *
 * Two reasons. A pure function in src/scoring/ importing a model type would
 * make the module's independence from the ORM a matter of luck. And the model's
 * attributes are `CreationOptional<T>` — branded intersections that a plain
 * object literal cannot always satisfy, so `Pick` of them would push the brand
 * out into every caller and every test.
 *
 * Satisfied as-is by a Lead model instance, by a GeneratedInteraction from the
 * seeder, and by an object literal in a spec.
 */
export interface ScorableLead {
  status: LeadStatus;
  /** Whole dollars, or null when the lead has not stated one. */
  budget: number | null;
}

export interface ScorableInteraction {
  occurredAt: Date;
}

const MS_PER_DAY = 86_400_000;

/**
 * Days since the most recent interaction. 40 points — the largest single
 * component, because a lead nobody has touched in three months is cold whatever
 * else is true of it.
 *
 * Read top-down, first match wins: each entry is the INCLUSIVE upper bound of
 * its band in whole days. So 3 days scores 40 and 4 days scores 34; 90 scores 3
 * and 91 scores 0. A lead with no interactions at all also scores 0 — there is
 * no recency to measure, and treating "never contacted" as "contacted today"
 * would be the wrong direction to round.
 */
const RECENCY_BANDS: readonly (readonly [maxDays: number, points: number])[] = [
  [3, 40],
  [7, 34],
  [14, 26],
  [30, 16],
  [60, 8],
  [90, 3],
];

/** Interactions this recent count toward engagement. Inclusive: 30 days ago counts, 31 does not. */
const ENGAGEMENT_WINDOW_DAYS = 30;

/**
 * Interactions inside the window. 30 points, indexed by count and capped at
 * five: 0 -> 0, 1 -> 10, 2 -> 18, 3 -> 24, 4 -> 28, 5 or more -> 30.
 *
 * Diminishing returns on purpose. The gap between nobody-called and
 * somebody-called-once is the biggest signal in the array, and the difference
 * between five calls and nine is noise.
 */
const ENGAGEMENT_POINTS: readonly number[] = [0, 10, 18, 24, 28, 30];

/**
 * Stated budget. 15 points.
 *
 * Read top-down, first match wins: each entry is the INCLUSIVE lower bound of
 * its band. So $499,999 scores 7 and $500,000 scores 11. A null budget scores
 * 0 — not stated is not the same as small, but it is not evidence of a large
 * one either, and the honest reading of silence here is no points rather than
 * an average.
 */
const BUDGET_BANDS: readonly (readonly [minDollars: number, points: number])[] =
  [
    [1_000_000, 15],
    [750_000, 14],
    [500_000, 11],
    [300_000, 7],
    [0, 3],
  ];

/**
 * Where the lead sits in the pipeline. 15 points.
 *
 * A Record over the union rather than a lookup with a default, so adding a
 * LeadStatus member is a COMPILE ERROR here instead of a silent zero.
 *
 * `qualified` above `active` is a judgement call worth naming: in this repo
 * `active` means new and untouched while `qualified` means vetted and ready to
 * transact, so this ranks by transaction-readiness (execution plan, R1). The
 * zeroes for `closed` and `lost` are belt-and-braces — the clamp in `scoreLead`
 * takes those totals to 0 outright.
 */
const STATUS_POINTS: Readonly<Record<LeadStatus, number>> = {
  qualified: 15,
  contacted: 11,
  active: 8,
  closed: 0,
  lost: 0,
};

/**
 * Statuses that zero the whole score, not just their own component.
 *
 * Without the clamp a recently-worked $1.2M lost lead scores 85 and lands at
 * the top of a list captioned "hottest leads first" — a bug wearing a feature's
 * clothes. There is no work left to do on a closed or lost lead, so there is no
 * heat to report.
 */
const TERMINAL_STATUSES: readonly LeadStatus[] = ['closed', 'lost'];

export function scoreLead(
  lead: ScorableLead,
  interactions: readonly ScorableInteraction[],
  now: Date,
): number {
  if (TERMINAL_STATUSES.includes(lead.status)) {
    return 0;
  }

  return (
    recencyPoints(interactions, now) +
    engagementPoints(interactions, now) +
    budgetPoints(lead.budget) +
    STATUS_POINTS[lead.status]
  );
}

function recencyPoints(
  interactions: readonly ScorableInteraction[],
  now: Date,
): number {
  if (interactions.length === 0) {
    return 0;
  }

  // Max, not [0] or [length - 1]: callers hand these over in whatever order
  // their query produced, and the detail query happens to sort DESC while the
  // seeder sorts ASC. Depending on either would be a bug that only shows up in
  // one of them.
  const mostRecent = Math.max(
    ...interactions.map((interaction) => interaction.occurredAt.getTime()),
  );

  return bandPoints(RECENCY_BANDS, daysBefore(mostRecent, now));
}

function engagementPoints(
  interactions: readonly ScorableInteraction[],
  now: Date,
): number {
  const recent = interactions.filter(
    (interaction) =>
      daysBefore(interaction.occurredAt.getTime(), now) <=
      ENGAGEMENT_WINDOW_DAYS,
  ).length;

  return ENGAGEMENT_POINTS[Math.min(recent, ENGAGEMENT_POINTS.length - 1)];
}

function budgetPoints(budget: number | null): number {
  if (budget === null) {
    return 0;
  }

  // A negative budget is nonsense the schema does not actually forbid
  // (migration 001 leaves `budget` an unconstrained INTEGER). It matches no
  // band and scores nothing, rather than throwing on a row somebody typed
  // wrong.
  return BUDGET_BANDS.find(([minDollars]) => budget >= minDollars)?.[1] ?? 0;
}

/** First band whose inclusive upper bound the value fits under; 0 if it fits none. */
function bandPoints(
  bands: readonly (readonly [max: number, points: number])[],
  value: number,
): number {
  return bands.find(([max]) => value <= max)?.[1] ?? 0;
}

/**
 * Whole days between an instant and `now`, floored.
 *
 * Floored rather than rounded so a band boundary means what the table says: an
 * interaction 3 days and 23 hours old is "3 days ago" and still scores 40.
 *
 * Clamped at zero because `occurredAt` is client-supplied on
 * POST /api/leads/:id/interactions and nothing stops a future date. A future
 * interaction reads as today — the alternative, negative days, would score the
 * same 40 while making the arithmetic below harder to reason about.
 */
function daysBefore(instant: number, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - instant) / MS_PER_DAY));
}
