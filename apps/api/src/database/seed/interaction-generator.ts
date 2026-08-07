import type { InteractionType } from '@ai-academy/shared';
import { INTERACTION_TYPES } from '../../interactions/interaction-type';

/**
 * Generates the 2-5 interactions per lead that the CSV does not carry
 * (day-1-build-requirements.md:139 — the file is leads only).
 *
 * Seeded PRNG, per D13: re-seeding the same data must produce the same history,
 * or every `db:seed:fresh` silently changes what Day 2's activity score is
 * computed from and nobody can tell a code change from a data change.
 *
 * `now` is a parameter rather than a `new Date()` call inside. Two reasons: it
 * keeps the function honestly pure, and interactions must never be dated in the
 * future — leads inquire as recently as a few days ago, so a fixed forward
 * offset would put their history ahead of today.
 */

export interface GeneratedInteraction {
  leadId: string;
  type: InteractionType;
  occurredAt: Date;
  notes: string | null;
}

const MIN_PER_LEAD = 2;
const MAX_PER_LEAD = 5;

/**
 * mulberry32 — the same generator scripts/generate-seed-leads.mjs uses, so the
 * two halves of the seed data are produced the same way.
 */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOTES: Record<InteractionType, readonly string[]> = {
  call: [
    'Left a voicemail; no answer.',
    'Talked through budget and timeline. Wants to see listings this month.',
    'Quick check-in. Still deciding between two neighbourhoods.',
  ],
  email: [
    'Sent three matching listings.',
    'Followed up on the mortgage pre-approval paperwork.',
    'Shared the neighbourhood comps they asked for.',
  ],
  meeting: [
    'Toured two properties. Preferred the second.',
    'Sat down to go over offer strategy.',
    'Open house walkthrough; brought a family member along.',
  ],
  note: [
    'Prefers evening contact after 6pm.',
    'Pre-approved with their own lender.',
    'Timeline slipped a month; revisit in a few weeks.',
  ],
};

/**
 * Deterministic given (leadId, index, inquiryDate, now). The index is folded
 * into the seed so that two leads sharing an inquiry date do not get identical
 * histories.
 */
export function generateInteractions(
  lead: { id: string; inquiryDate: string },
  index: number,
  now: Date,
): GeneratedInteraction[] {
  const rng = makeRng(0x5eed_0000 + index * 2654435761);

  const inquiredAt = new Date(`${lead.inquiryDate}T09:00:00Z`);
  // Clamped, because a lead that inquired yesterday has no room for a 40-day
  // history. Math.max keeps the window non-negative if a row is dated today.
  const windowMs = Math.max(0, now.getTime() - inquiredAt.getTime());

  const count =
    MIN_PER_LEAD + Math.floor(rng() * (MAX_PER_LEAD - MIN_PER_LEAD + 1));

  return Array.from({ length: count }, () => {
    const type =
      INTERACTION_TYPES[Math.floor(rng() * INTERACTION_TYPES.length)];
    const choices = NOTES[type];

    return {
      leadId: lead.id,
      type,
      occurredAt: new Date(inquiredAt.getTime() + Math.floor(rng() * windowMs)),
      // A quarter of interactions carry no notes — the column is nullable and a
      // seed where every row is populated never exercises the empty case.
      notes: rng() < 0.25 ? null : choices[Math.floor(rng() * choices.length)],
    };
  }).sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}
