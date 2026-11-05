import { badgeLabel, relativeTime } from './relative-time';

const NOW = new Date('2026-11-05T12:00:00.000Z');
const ago = (ms: number): string => new Date(NOW.getTime() - ms).toISOString();

describe('relativeTime', () => {
  it.each([
    [0, 'just now'],
    [59_000, 'just now'],
    [60_000, '1m ago'],
    [59 * 60_000, '59m ago'],
    [3_600_000, '1h ago'],
    [23 * 3_600_000, '23h ago'],
    [24 * 3_600_000, '1d ago'],
    [6 * 24 * 3_600_000, '6d ago'],
  ])('renders %i ms ago as "%s"', (ms, expected) => {
    expect(relativeTime(ago(ms), NOW)).toBe(expected);
  });

  it('falls back to a short date after a week', () => {
    expect(relativeTime(ago(30 * 24 * 3_600_000), NOW)).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
  });

  it('returns an unparseable value unchanged', () => {
    expect(relativeTime('nonsense', NOW)).toBe('nonsense');
  });
});

describe('badgeLabel', () => {
  it.each([
    [0, ''],
    [-1, ''],
    [7, '7'],
    [99, '99'],
    [100, '99+'],
  ])('renders %i as "%s"', (count, expected) => {
    expect(badgeLabel(count)).toBe(expected);
  });
});
