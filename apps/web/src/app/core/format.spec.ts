import {
  EM_DASH,
  formatBudget,
  formatCount,
  formatDateOnly,
  formatText,
  isoToLocalInput,
  localInputToIso,
} from './format';

describe('render-edge formatting', () => {
  it('renders every nullable value as an em-dash, never "null" or blank', () => {
    expect(formatBudget(null)).toBe(EM_DASH);
    expect(formatCount(null)).toBe(EM_DASH);
    expect(formatText(null)).toBe(EM_DASH);
    expect(formatText('   ')).toBe(EM_DASH);
  });

  it('keeps zero, which is a value and not an absence', () => {
    // bedrooms: 0 is a studio; budget: 0 is a stated budget of nothing.
    expect(formatCount(0)).toBe('0');
    expect(formatBudget(0)).toBe('$0');
  });

  it('reads a YYYY-MM-DD date as a local date, not midnight UTC', () => {
    // `new Date('2026-01-01')` is midnight UTC and renders as Dec 31 in every
    // US timezone. This is the trap the parts-based parse exists to avoid.
    expect(formatDateOnly('2026-01-01')).toBe('Jan 1, 2026');
    expect(formatDateOnly('2026-12-31')).toBe('Dec 31, 2026');
  });

  it('round-trips a local datetime-local value through ISO 8601', () => {
    const iso = localInputToIso('2026-03-04T14:30');
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(isoToLocalInput(iso)).toBe('2026-03-04T14:30');
  });

  it('treats a blank datetime as "omit the field" rather than a bad date', () => {
    expect(localInputToIso('')).toBeNull();
  });
});
