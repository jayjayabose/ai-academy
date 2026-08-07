import { INTERACTION_TYPES } from '../../interactions/interaction-type';
import { generateInteractions } from './interaction-generator';

const NOW = new Date('2026-08-07T12:00:00Z');
const LEAD = {
  id: '11111111-1111-4111-8111-111111111111',
  inquiryDate: '2026-04-15',
};

describe('generating a lead history for the seed data', () => {
  it('generates between two and five interactions, as the requirement asks', () => {
    // Checked across many leads rather than one, because a single call proves
    // nothing about the bounds — the count is drawn per lead.
    const counts = manyLeads(200).map(
      (lead, index) => generateInteractions(lead, index, NOW).length,
    );

    expect(Math.min(...counts)).toBe(2);
    expect(Math.max(...counts)).toBe(5);
  });

  it('produces the same history when run again with the same inputs', () => {
    // D13: re-seeding must be stable, or every db:seed:fresh quietly changes
    // what Day 2's activity score is computed from and a data change becomes
    // indistinguishable from a code change.
    expect(generateInteractions(LEAD, 7, NOW)).toEqual(
      generateInteractions(LEAD, 7, NOW),
    );
  });

  it('gives two leads different histories even when they inquired the same day', () => {
    const [first, second] = [3, 4].map((index) =>
      generateInteractions(LEAD, index, NOW),
    );

    expect(first).not.toEqual(second);
  });

  it('only uses interaction types the schema permits', () => {
    // The other half of the seam the 23514 test closes: the generator writes
    // straight to the column, so a type outside the union would fail the whole
    // import rather than one row.
    const types = manyLeads(200).flatMap((lead, index) =>
      generateInteractions(lead, index, NOW).map(
        (interaction) => interaction.type,
      ),
    );

    expect([...new Set(types)].sort()).toEqual([...INTERACTION_TYPES].sort());
  });

  it('dates every interaction between the inquiry and now', () => {
    // Never in the future: leads inquire as recently as a few days ago, so a
    // fixed forward offset would put their history ahead of today and make them
    // look artificially active on the Day 2 dashboard.
    const occurred = manyLeads(200).flatMap((lead, index) =>
      generateInteractions(lead, index, NOW).map(
        (interaction) => interaction.occurredAt,
      ),
    );

    const earliest = new Date(`${LEAD.inquiryDate}T00:00:00Z`);

    expect(occurred.every((at) => at >= earliest && at <= NOW)).toBe(true);
  });

  it('returns them oldest first', () => {
    const occurred = generateInteractions(LEAD, 12, NOW).map((i) =>
      i.occurredAt.getTime(),
    );

    expect(occurred).toEqual([...occurred].sort((a, b) => a - b));
  });

  it('leaves some notes empty, because the column is nullable', () => {
    // A seed where every row is populated never exercises the empty case, and
    // the first NULL note then shows up in the UI in front of a user.
    const notes = manyLeads(200).flatMap((lead, index) =>
      generateInteractions(lead, index, NOW).map(
        (interaction) => interaction.notes,
      ),
    );

    expect(notes).toContain(null);
    expect(notes.some((note) => note !== null)).toBe(true);
  });

  describe('when the lead inquired today', () => {
    it('still generates a history rather than dividing by an empty window', () => {
      const inquiredToday = { id: LEAD.id, inquiryDate: '2026-08-07' };

      const history = generateInteractions(
        inquiredToday,
        1,
        new Date('2026-08-07T00:00:00Z'),
      );

      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history.every((i) => !Number.isNaN(i.occurredAt.getTime()))).toBe(
        true,
      );
    });
  });
});

function manyLeads(count: number): { id: string; inquiryDate: string }[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `1111111${i}-1111-4111-8111-111111111111`,
    inquiryDate: LEAD.inquiryDate,
  }));
}
