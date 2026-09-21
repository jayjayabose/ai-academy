/**
 * The activity-score band vocabulary — how `Lead.activityScore` becomes a badge.
 *
 * Structured like core/summary-urgency.ts, with one deliberate difference worth
 * stating plainly: `ScoreBand` is a FRONTEND-ONLY concept. It is derived from
 * the number at render time, it is not on the wire, it is not stored, and it is
 * never sent to the API — the server persists a 0–100 integer and nothing else.
 * So unlike `SummaryUrgency` or `LeadStatus` there is no shared union here to
 * bridge with `satisfies` + `Exclude` against `packages/shared`.
 *
 * The union is declared three lines down instead, and SCORE_BANDS is still
 * bridged to it. Local-to-local, but the pair earns its keep for the same
 * reason it does elsewhere: it is what stops the array, the label map and the
 * union drifting apart when a fourth band is added.
 *
 * The names are semantic, not chromatic. Red/amber/green live in styles.scss;
 * a repalette touches no TypeScript, and "cold" stays true if the badge ever
 * becomes a bar or a dot.
 *
 * The 30/70 cutoffs are stated ONCE, here. The list and the detail page both
 * derive their badge from `scoreBand`, so there is no second copy to disagree
 * with this one.
 */

type AssertEmpty<T extends never> = T;

export type ScoreBand = 'cold' | 'warm' | 'hot';

/** Coldest first, so iterating this reads in score order. */
export const SCORE_BANDS = ['cold', 'warm', 'hot'] as const satisfies readonly ScoreBand[];

// Fails to compile if a ScoreBand member is missing from the array above.
export type _ScoreBandExhaustive = AssertEmpty<Exclude<ScoreBand, (typeof SCORE_BANDS)[number]>>;

/** Top of `cold`, inclusive. 30 is cold; 31 is warm. */
const COLD_MAX = 30;

/** Top of `warm`, inclusive. 70 is warm; 71 is hot. */
const WARM_MAX = 70;

/**
 * cold 0–30 · warm 31–70 · hot 71–100.
 *
 * Takes a `number`, NOT `number | null`. That is the whole point of the
 * signature: `null` means never scored, which is not a band — it renders as an
 * em-dash and sorts last. Admitting null here would let a caller collapse
 * "unscored" into "ice cold" and take the 23 terminal leads that score a real 0
 * with it. The compiler refuses instead.
 */
export function scoreBand(score: number): ScoreBand {
  if (score <= COLD_MAX) return 'cold';
  if (score <= WARM_MAX) return 'warm';
  return 'hot';
}

/**
 * The word the badge's colour stands for.
 *
 * `Record<ScoreBand, string>` rather than a lookup with a fallback: the map is
 * never indexed dynamically, so a new band missing a label is a compile error
 * here rather than a blank badge in front of a salesperson. Same reasoning as
 * SUMMARY_URGENCY_LABELS.
 *
 * Lower-case because these are read inside a sentence — see `scoreAriaLabel` —
 * not shown as standalone badge text the way the urgency pill's labels are.
 */
export const SCORE_BAND_LABELS: Readonly<Record<ScoreBand, string>> = {
  cold: 'cold',
  warm: 'warm',
  hot: 'hot',
};

/**
 * The badge's accessible name, e.g. "Activity score 84, hot".
 *
 * Colour is never the only signal. The number is always visible, and the band —
 * the only thing the colour encodes — is spelled out here for anyone who cannot
 * see it. The urgency pill meets the same standard by putting its band in the
 * badge text; a score badge in a table cell has no room for that, so the label
 * carries it instead.
 *
 * Lives here rather than in either component so the two pages cannot word it
 * differently.
 */
export function scoreAriaLabel(score: number): string {
  return `Activity score ${score}, ${SCORE_BAND_LABELS[scoreBand(score)]}`;
}
