import { buildInteraction, buildLead } from '@test/helpers/build-models';
import { LEAD_STATUSES } from '../leads/lead-status';
import type { ScorableInteraction, ScorableLead } from './activity-score';
import { scoreLead } from './activity-score';

/**
 * Every band boundary of all four components, from both sides.
 *
 * The scorer takes `now` as a parameter, so these are exact-integer
 * assertions against a frozen clock rather than tolerances — and the whole
 * file runs with Docker stopped, which is the unit tier's rule.
 *
 * The assertions are TOTALS, not component points: the components are private,
 * and exporting them so a test could reach one would widen the module's API for
 * the test's convenience. So each table writes its arithmetic out in a
 * `breakdown` column that goes into the test name. A wrong expectation is then
 * visible in the table rather than merely red in the runner, and the
 * composition is documented where someone changing a weight will read it.
 *
 * Real (unsaved) model instances rather than object literals, because the
 * scorer calls `.getTime()` on `occurredAt` and a literal cast to the right
 * shape would let a string through the exact place this file exists to check.
 */

const NOW = new Date('2026-09-21T12:00:00Z');
const MS_PER_DAY = 86_400_000;

/** Status `active` is worth 8 and a null budget 0, so those two drop out of the sums below. */
const BASELINE = { status: 'active', budget: null } as const;

describe('scoring a lead activity', () => {
  describe('recency, worth 40', () => {
    // One interaction, at the stated age. It also lands inside the 30-day
    // engagement window up to and including day 30, which is why the
    // engagement term in the breakdown falls away from day 31 on.
    it.each([
      { days: 0, breakdown: '40 + 10 + 8', total: 58 },
      { days: 3, breakdown: '40 + 10 + 8', total: 58 },
      { days: 4, breakdown: '34 + 10 + 8', total: 52 },
      { days: 7, breakdown: '34 + 10 + 8', total: 52 },
      { days: 8, breakdown: '26 + 10 + 8', total: 44 },
      { days: 14, breakdown: '26 + 10 + 8', total: 44 },
      { days: 15, breakdown: '16 + 10 + 8', total: 34 },
      { days: 30, breakdown: '16 + 10 + 8', total: 34 },
      { days: 31, breakdown: '8 + 0 + 8', total: 16 },
      { days: 60, breakdown: '8 + 0 + 8', total: 16 },
      { days: 61, breakdown: '3 + 0 + 8', total: 11 },
      { days: 90, breakdown: '3 + 0 + 8', total: 11 },
      { days: 91, breakdown: '0 + 0 + 8', total: 8 },
      { days: 400, breakdown: '0 + 0 + 8', total: 8 },
    ])(
      'scores $total at $days days since the last interaction ($breakdown)',
      ({ days, total }) => {
        expect(score(BASELINE, [daysAgo(days)])).toBe(total);
      },
    );

    it('floors the age, so a boundary means the whole day', () => {
      // 3 days and 23 hours is still "3 days ago" and still scores the top
      // band. Rounding instead would move every boundary half a day earlier
      // than the table in activity-score.ts claims.
      expect(score(BASELINE, [hoursAgo(3 * 24 + 23)])).toBe(58);
      expect(score(BASELINE, [hoursAgo(4 * 24)])).toBe(52);
    });

    it('measures from the most recent interaction, in whatever order they arrive', () => {
      // The detail query sorts interactions DESC and the seeder sorts them
      // ASC. Reading either end of the array would be a bug visible in only
      // one of those callers.
      const history = [daysAgo(200), daysAgo(2), daysAgo(75)];

      expect(score(BASELINE, history)).toBe(
        score(BASELINE, [...history].reverse()),
      );
      // 40 recency + 10 engagement (only the 2-day one is inside the window) + 8
      expect(score(BASELINE, history)).toBe(58);
    });

    it('scores no recency at all for a lead nobody has ever contacted', () => {
      // 0, not the top band. "Never contacted" is not "contacted today", and
      // an empty history rounding upward would put brand-new leads above
      // worked ones.
      expect(score(BASELINE, [])).toBe(8);
    });

    it('treats a future-dated interaction as today rather than going negative', () => {
      // occurredAt is client-supplied on POST /api/leads/:id/interactions and
      // nothing stops a date in the future.
      expect(score(BASELINE, [daysAgo(-5)])).toBe(58);
    });
  });

  describe('engagement, worth 30', () => {
    // All interactions one day old, so recency is pinned at 40 and only the
    // count varies.
    it.each([
      { count: 0, breakdown: '0 + 0 + 8', total: 8 },
      { count: 1, breakdown: '40 + 10 + 8', total: 58 },
      { count: 2, breakdown: '40 + 18 + 8', total: 66 },
      { count: 3, breakdown: '40 + 24 + 8', total: 72 },
      { count: 4, breakdown: '40 + 28 + 8', total: 76 },
      { count: 5, breakdown: '40 + 30 + 8', total: 78 },
      { count: 9, breakdown: '40 + 30 + 8', total: 78 },
    ])(
      'scores $total for $count interactions in the window ($breakdown)',
      ({ count, total }) => {
        const history = Array.from({ length: count }, () => daysAgo(1));

        expect(score(BASELINE, history)).toBe(total);
      },
    );

    it('counts an interaction 30 days old and ignores one 31 days old', () => {
      // The window boundary on its own, held away from the recency boundary by
      // a second interaction two days old that fixes recency at 40 for both.
      const inside = [daysAgo(2), daysAgo(30)];
      const outside = [daysAgo(2), daysAgo(31)];

      expect(score(BASELINE, inside)).toBe(66); // 40 + 18 + 8
      expect(score(BASELINE, outside)).toBe(58); // 40 + 10 + 8
    });
  });

  describe('budget, worth 15', () => {
    // One interaction a day old: 40 recency + 10 engagement + 8 active = 58
    // before the budget term.
    it.each([
      { budget: null, breakdown: '58 + 0', total: 58 },
      { budget: 0, breakdown: '58 + 3', total: 61 },
      { budget: 299_999, breakdown: '58 + 3', total: 61 },
      { budget: 300_000, breakdown: '58 + 7', total: 65 },
      { budget: 499_999, breakdown: '58 + 7', total: 65 },
      { budget: 500_000, breakdown: '58 + 11', total: 69 },
      { budget: 749_999, breakdown: '58 + 11', total: 69 },
      { budget: 750_000, breakdown: '58 + 14', total: 72 },
      { budget: 999_999, breakdown: '58 + 14', total: 72 },
      { budget: 1_000_000, breakdown: '58 + 15', total: 73 },
      { budget: 4_500_000, breakdown: '58 + 15', total: 73 },
    ])(
      'scores $total on a budget of $budget ($breakdown)',
      ({ budget, total }) => {
        expect(score({ status: 'active', budget }, [daysAgo(1)])).toBe(total);
      },
    );

    it('scores a null budget as 0, not as a small one', () => {
      // Not stated is not the same as small — but silence is no evidence of a
      // large budget either, so it earns nothing rather than an average.
      expect(
        score({ status: 'active', budget: null }, [daysAgo(1)]),
      ).toBeLessThan(score({ status: 'active', budget: 1 }, [daysAgo(1)]));
    });
  });

  describe('status, worth 15', () => {
    // 40 recency + 10 engagement + 0 budget = 50 before the status term.
    it.each([
      { status: 'qualified', breakdown: '50 + 15', total: 65 },
      { status: 'contacted', breakdown: '50 + 11', total: 61 },
      { status: 'active', breakdown: '50 + 8', total: 58 },
      { status: 'closed', breakdown: 'clamped', total: 0 },
      { status: 'lost', breakdown: 'clamped', total: 0 },
    ] as const)(
      'scores $total for a $status lead ($breakdown)',
      ({ status, total }) => {
        expect(score({ status, budget: null }, [daysAgo(1)])).toBe(total);
      },
    );

    it('ranks qualified above active, because active here means new and untouched', () => {
      // The arguable half of R1, pinned so that flipping it is a deliberate
      // edit to a failing test rather than a quiet change of meaning.
      const history = [daysAgo(1)];

      expect(
        score({ status: 'qualified', budget: null }, history),
      ).toBeGreaterThan(score({ status: 'active', budget: null }, history));
    });
  });

  describe('the terminal-status clamp', () => {
    it.each(['closed', 'lost'] as const)(
      'scores a %s lead 0 even when every other component is maxed',
      (status) => {
        // A recently-worked $1.2M lost lead would otherwise score 85 and top a
        // list captioned "hottest leads first".
        const worked = Array.from({ length: 5 }, () => daysAgo(1));

        expect(score({ status: 'qualified', budget: 1_200_000 }, worked)).toBe(
          100,
        );
        expect(score({ status, budget: 1_200_000 }, worked)).toBe(0);
      },
    );
  });

  describe('the bounds the column promises', () => {
    it('reaches exactly 100 when every component is maxed, so the weights still sum to 100', () => {
      // The only guard on the range: the scorer does not clamp, deliberately,
      // so a reweighting that broke this sum would show up here first and at
      // leads_activity_score_range_check second.
      const worked = Array.from({ length: 5 }, () => daysAgo(0));

      expect(score({ status: 'qualified', budget: 1_000_000 }, worked)).toBe(
        100,
      );
    });

    it.each([...LEAD_STATUSES])(
      'produces an integer within 0-100 for every combination of a %s lead',
      (status) => {
        // Swept rather than spot-checked: the column is INTEGER with a
        // BETWEEN 0 AND 100 check, so a fractional or out-of-range result is a
        // 500 on a write rather than a wrong badge.
        for (const budget of [null, 0, 250_000, 600_000, 3_000_000]) {
          for (const days of [0, 5, 29, 31, 95]) {
            for (const count of [0, 1, 3, 7]) {
              const history = Array.from({ length: count }, () =>
                daysAgo(days),
              );
              const result = score({ status, budget }, history);

              expect(Number.isInteger(result)).toBe(true);
              expect(result).toBeGreaterThanOrEqual(0);
              expect(result).toBeLessThanOrEqual(100);
            }
          }
        }
      },
    );
  });

  it('reads a real Lead model instance, not only an object literal', () => {
    // The service hands over model instances, where `status` is a branded
    // CreationOptional and `budget` comes back off the row. This is the
    // assurance that ScorableLead is satisfied by what actually calls it.
    const lead = buildLead({ status: 'contacted', budget: 500_000 });
    const interaction = buildInteraction({
      occurredAt: new Date(NOW.getTime() - 2 * MS_PER_DAY),
    });

    // 40 recency + 10 engagement + 11 budget + 11 contacted
    expect(scoreLead(lead, [interaction], NOW)).toBe(72);
  });
});

// Helpers below the tests: they are plumbing, not specification.

function score(
  lead: ScorableLead,
  interactions: readonly ScorableInteraction[],
): number {
  return scoreLead(lead, interactions, NOW);
}

/** An interaction exactly `days` whole days before NOW. Negative means the future. */
function daysAgo(days: number): ScorableInteraction {
  return { occurredAt: new Date(NOW.getTime() - days * MS_PER_DAY) };
}

function hoursAgo(hours: number): ScorableInteraction {
  return { occurredAt: new Date(NOW.getTime() - hours * 3_600_000) };
}
