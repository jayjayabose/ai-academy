import type { ScoreBand } from './activity-score';
import { SCORE_BANDS, SCORE_BAND_LABELS, scoreAriaLabel, scoreBand } from './activity-score';

/**
 * The band words, spelled out rather than imported from SCORE_BAND_LABELS.
 *
 * Importing the map would make these assertions circular — a typo in it would
 * change both the render and the expectation and the suite would stay green,
 * exactly as the urgency-label spec records. Typing this as a full Record keeps
 * the exhaustiveness the map has, so a fourth band is a compile error here too.
 */
const EXPECTED_BAND_LABELS: Readonly<Record<ScoreBand, string>> = {
  cold: 'cold',
  warm: 'warm',
  hot: 'hot',
};

describe('activity score bands', () => {
  /**
   * Every cutoff from both sides. Off-by-one is the only interesting failure a
   * three-branch function has, and it is invisible in a browser: a 71 rendered
   * amber instead of green looks like a design choice.
   */
  it('puts 0 and 30 in cold, and 31 out of it', () => {
    expect(scoreBand(0)).toBe('cold');
    expect(scoreBand(30)).toBe('cold');
    expect(scoreBand(31)).toBe('warm');
  });

  it('puts 70 in warm, and 71 out of it', () => {
    expect(scoreBand(70)).toBe('warm');
    expect(scoreBand(71)).toBe('hot');
  });

  it('puts 100, the top of the range, in hot', () => {
    expect(scoreBand(100)).toBe('hot');
  });

  it('bands a real 0 rather than treating it as missing', () => {
    // A `closed` or `lost` lead is clamped to 0 by the server and is still a
    // scored lead — 23 of the 100 seeded rows. If 0 ever became "no band" they
    // would all vanish from the bottom of the table into a row of dashes.
    // `scoreBand` cannot even be asked about null; that is what the
    // `number` parameter type is for, and it is checked at compile time.
    expect(scoreBand(0)).toBe('cold');
  });

  it('labels every band', () => {
    for (const band of SCORE_BANDS) {
      expect(SCORE_BAND_LABELS[band]).toBe(EXPECTED_BAND_LABELS[band]);
    }
    expect(Object.keys(SCORE_BAND_LABELS).length).toBe(SCORE_BANDS.length);
  });

  it('names the badge with the number AND the band, so colour is never alone', () => {
    expect(scoreAriaLabel(84)).toBe('Activity score 84, hot');
    expect(scoreAriaLabel(50)).toBe('Activity score 50, warm');
    expect(scoreAriaLabel(0)).toBe('Activity score 0, cold');
  });
});
