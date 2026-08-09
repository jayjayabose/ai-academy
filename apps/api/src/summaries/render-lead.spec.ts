import {
  buildInteraction,
  buildLead,
  buildThinLead,
} from '@test/helpers/build-models';
import { renderLead } from './render-lead';

/**
 * The prompt is an input to a paid, non-deterministic system, so it is the one
 * part of the summarisation path that can be pinned down exactly. What matters is
 * not the wording but two properties: everything known about the lead reaches the
 * model, and nothing unknown is fabricated on the way.
 *
 * The thin-lead case gets the most attention because it is where the model is
 * most likely to invent detail, and the prompt is the only lever on that.
 */
describe('the lead prompt', () => {
  it('carries every field the record actually has', () => {
    const rendered = renderLead(buildLead(), []);

    expect(rendered).toContain('Name: Ada Lovelace');
    expect(rendered).toContain('Status: qualified');
    expect(rendered).toContain('Location: Littleton');
    expect(rendered).toContain('Property type: condo');
    expect(rendered).toContain('Wants a south-facing balcony.');
  });

  it('writes the budget as money rather than a bare integer', () => {
    // The column is whole dollars. Unlabelled, 480000 is as readable as a
    // bedroom count or a postcode.
    expect(renderLead(buildLead({ budget: 480000 }), [])).toContain(
      'Budget: $480,000',
    );
  });

  it('lists interactions newest first, matching the detail endpoint', () => {
    const rendered = renderLead(buildLead(), [
      buildInteraction({
        occurredAt: new Date('2026-08-01T10:00:00.000Z'),
        notes: 'Newest',
      }),
      buildInteraction({
        occurredAt: new Date('2026-06-01T10:00:00.000Z'),
        notes: 'Oldest',
      }),
    ]);

    expect(rendered).toContain('- 2026-08-01 call: Newest');
    expect(rendered.indexOf('Newest')).toBeLessThan(rendered.indexOf('Oldest'));
  });

  it('says an interaction had no notes rather than trailing off', () => {
    const rendered = renderLead(buildLead(), [
      buildInteraction({ type: 'email', notes: null }),
    ]);

    expect(rendered).toContain('email (no notes recorded)');
  });

  describe('given a thin lead — no interactions, most fields unknown', () => {
    const rendered = renderLead(buildThinLead(), []);

    it('omits the unknown fields instead of reporting them as null', () => {
      // "Budget: null" invites the model to remark on the null, or worse to
      // treat it as a value. Absence is the honest signal.
      expect(rendered).not.toMatch(/null/i);
      expect(rendered).not.toContain('Budget:');
      expect(rendered).not.toContain('Property type:');
    });

    it('still carries the identity fields that do exist', () => {
      expect(rendered).toContain('Name: Ada Lovelace');
      expect(rendered).toContain('Email: ada@example.com');
      expect(rendered).toContain('Inquiry date: 2026-06-05');
    });

    it('states outright that there is no history', () => {
      // An empty section under a heading reads as truncated input, which is
      // exactly when a model starts filling gaps.
      expect(rendered).toContain('INTERACTION HISTORY (0, newest first)');
      expect(rendered).toContain(
        'No interactions have been recorded for this lead.',
      );
    });
  });
});
