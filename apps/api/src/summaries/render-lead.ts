import type { Interaction } from '../interactions/interaction.model';
import type { Lead } from '../leads/lead.model';

/**
 * The lead and its history as plain text for the model.
 *
 * Plain labelled lines rather than JSON: the model is reading, not parsing, and
 * JSON spends tokens on punctuation and forces a decision about how to spell
 * null. Here an unknown field is simply absent, and absence is the honest signal
 * — "budget: null" invites the model to remark on the null.
 *
 * Interactions are newest first, matching the detail endpoint, so "most recent
 * contact" is the first thing the model reads rather than something it has to
 * scan for.
 */
export function renderLead(lead: Lead, interactions: Interaction[]): string {
  const facts: [string, string | number | null][] = [
    ['Name', `${lead.firstName} ${lead.lastName}`],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Status', lead.status],
    [
      'Budget',
      lead.budget === null ? null : `$${lead.budget.toLocaleString()}`,
    ],
    ['Location', lead.location],
    ['Property type', lead.propertyType],
    ['Bedrooms', lead.bedrooms],
    ['Source', lead.source],
    ['Inquiry date', lead.inquiryDate],
    ['Notes', lead.notes],
  ];

  const known = facts
    .filter(([, value]) => value !== null && value !== '')
    .map(([label, value]) => `${label}: ${String(value)}`);

  return [
    'LEAD',
    ...known,
    '',
    `INTERACTION HISTORY (${interactions.length}, newest first)`,
    ...renderHistory(interactions),
  ].join('\n');
}

function renderHistory(interactions: Interaction[]): string[] {
  // Said outright rather than left as an empty section. A blank heading reads as
  // truncated input, and the thin case is exactly where the model is most likely
  // to invent history rather than report its absence.
  if (interactions.length === 0) {
    return ['No interactions have been recorded for this lead.'];
  }

  return interactions.map((interaction) => {
    const when = interaction.occurredAt.toISOString().slice(0, 10);
    const notes = interaction.notes?.trim();

    return notes
      ? `- ${when} ${interaction.type}: ${notes}`
      : `- ${when} ${interaction.type} (no notes recorded)`;
  });
}
