import type { Lead, LeadDetail, LeadSummary } from '@ai-academy/shared';

/**
 * Hand-written sample rows for the component specs, typed against the real wire
 * contract so a contract change breaks them at compile time.
 *
 * These were originally the data half of a fixture layer that also reimplemented
 * the API in an HttpInterceptor. The API exists now, so the reimplementation is
 * gone — it could only ever confirm that the components agreed with a guess about
 * NestJS. The data survives because it is genuinely useful: chosen for the shapes
 * that break UIs, not for realism.
 *
 * The set is chosen for the shapes that break UIs, not for realism:
 *
 *   - `land` with `bedrooms: null`          — Ben Castellano, Robert Njoroge
 *   - `budget: null`                        — Priya Raghunathan, Robert Njoroge
 *   - `location: null` AND `propertyType: null` — Tomás Herrera
 *   - zero interactions                     — Dana Whitfield, Robert Njoroge
 *   - five interactions                     — Amara Okafor
 *   - `bedrooms: 0` (a studio, a real value — must NOT render as an em-dash)
 *                                           — Elena Petrova
 *   - every nullable column null at once    — Robert Njoroge
 *   - `summary: null` (never generated)     — Dana Whitfield, Tomás Herrera,
 *                                             Robert Njoroge
 *   - all three `SummaryUrgency` values     — high: Amara Okafor;
 *                                             medium: Ben Castellano, Elena
 *                                             Petrova, Sofia Marchetti;
 *                                             low: Marcus Bell, Yuki Tanaka
 *   - `activityScore: null` (never scored)  — Dana Whitfield
 *   - `activityScore: 0` (a REAL score, the terminal clamp, NOT a missing one)
 *                                           — Marcus Bell (lost), Yuki Tanaka
 *                                             (closed)
 *   - all three score bands                 — cold 0–30: Marcus Bell 0, Yuki
 *                                             Tanaka 0, Robert Njoroge 15;
 *                                             warm 31–70: Sofia Marchetti 31,
 *                                             Elena Petrova 50, Priya
 *                                             Raghunathan 52, Tomás Herrera 65;
 *                                             hot 71–100: Ben Castellano 72,
 *                                             Amara Okafor 78
 *   - both sides of a band cutoff           — Sofia Marchetti 31 and Ben
 *                                             Castellano 72 sit one point off
 *                                             the 30 and 71 boundaries
 *
 * The scores are NOT invented. Each is what Task A's scorer returns for that
 * record at {@link SCORED_AT}, worked through component by component in the
 * comment above it (recency 40 · engagement 30 · budget 15 · status 15, with
 * `closed`/`lost` clamped to 0). A fixture that disagrees with the real scorer
 * teaches the specs the wrong thing, and the badge is the only place anyone
 * would ever notice.
 *
 * The narratives are the length the real model actually returns — 300–400
 * characters, measured off Task A's live calls — because a fixture that is one
 * short sentence proves nothing about whether the card holds its layout.
 *
 * Row order is deliberately NOT inquiryDate-descending, so the list's default
 * sort is actually doing something. It is not score-descending either, for the
 * same reason.
 */

/**
 * When every scored fixture below was scored.
 *
 * One value shared across all nine, because a bulk recalculation stamps one
 * `now` for the whole batch rather than one per row — Task A pins that with a
 * test, and per-row timestamps would claim an event that did not happen.
 *
 * 2026-08-07 is a couple of days after the newest interaction in the set, so the
 * recency component has a range to measure across instead of collapsing every
 * lead into the same band.
 */
const SCORED_AT = '2026-08-07T09:00:00.000Z';

export const SAMPLE_LEADS: LeadDetail[] = [
  {
    id: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e001',
    firstName: 'Dana',
    lastName: 'Whitfield',
    email: 'dana.whitfield@example.com',
    phone: '+1 312-555-0147',
    status: 'active',
    budget: 315000,
    location: 'Brookside',
    propertyType: 'townhouse',
    bedrooms: 3,
    source: 'zillow',
    inquiryDate: '2026-07-29',
    notes: 'Wants to be within walking distance of the Green Line.',
    createdAt: '2026-07-29T14:02:11.000Z',
    updatedAt: '2026-07-29T14:02:11.000Z',
    // Edge case: NEVER SCORED. `null` is not `0` — this is the shape a lead
    // created through POST /api/leads has until someone recalculates (R2), and
    // it must render as an em-dash and sort last, not as an ice-cold zero. Both
    // fields are null together because `leads_activity_score_complete_check`
    // makes the half-populated pair unrepresentable.
    activityScore: null,
    scoreCalculatedAt: null,
    // Edge case: a brand new lead nobody has contacted yet.
    interactions: [],
    // Edge case: never summarised. Opening this lead is what triggers the
    // component's one-shot generate-on-first-view.
    summary: null,
  },
  {
    id: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e002',
    firstName: 'Amara',
    lastName: 'Okafor',
    email: 'amara.okafor@example.com',
    phone: '+1 773-555-0198',
    status: 'qualified',
    budget: 675000,
    location: 'Oak Park',
    propertyType: 'single-family',
    bedrooms: 4,
    source: 'referral',
    inquiryDate: '2026-06-14',
    notes: 'Pre-approved. Selling current home in the spring; timing is flexible.',
    createdAt: '2026-06-14T09:20:00.000Z',
    updatedAt: '2026-08-01T16:41:09.000Z',
    // Hot, 78 = 34 recency (5 days) + 18 engagement (2 in 30 days) + 11 budget
    // (675k) + 15 qualified.
    activityScore: 78,
    scoreCalculatedAt: SCORED_AT,
    // Edge case: five interactions, deliberately stored out of order.
    interactions: [
      {
        id: '8c7d6e5f-4a3b-4c2d-9e1f-0a1b2c3d0101',
        leadId: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e002',
        type: 'note',
        occurredAt: '2026-06-14T09:25:00.000Z',
        notes: 'Inbound from the Ridgeland open house sign-in sheet.',
        createdAt: '2026-06-14T09:25:00.000Z',
        updatedAt: '2026-06-14T09:25:00.000Z',
      },
      {
        id: '8c7d6e5f-4a3b-4c2d-9e1f-0a1b2c3d0102',
        leadId: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e002',
        type: 'call',
        occurredAt: '2026-06-16T15:10:00.000Z',
        notes: 'Twenty minutes on schools. Wants District 97, will not compromise.',
        createdAt: '2026-06-16T15:40:00.000Z',
        updatedAt: '2026-06-16T15:40:00.000Z',
      },
      {
        id: '8c7d6e5f-4a3b-4c2d-9e1f-0a1b2c3d0103',
        leadId: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e002',
        type: 'email',
        occurredAt: '2026-07-02T11:00:00.000Z',
        notes: null,
        createdAt: '2026-07-02T11:00:00.000Z',
        updatedAt: '2026-07-02T11:00:00.000Z',
      },
      {
        id: '8c7d6e5f-4a3b-4c2d-9e1f-0a1b2c3d0104',
        leadId: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e002',
        type: 'meeting',
        occurredAt: '2026-07-19T18:30:00.000Z',
        notes: 'Toured three properties on Kenilworth. Liked the 1920s foursquare.',
        createdAt: '2026-07-19T21:02:00.000Z',
        updatedAt: '2026-07-19T21:02:00.000Z',
      },
      {
        id: '8c7d6e5f-4a3b-4c2d-9e1f-0a1b2c3d0105',
        leadId: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e002',
        type: 'call',
        occurredAt: '2026-08-01T16:40:00.000Z',
        notes: 'Moving to qualified — lender letter received.',
        createdAt: '2026-08-01T16:41:09.000Z',
        updatedAt: '2026-08-01T16:41:09.000Z',
      },
    ],
    // Already summarised, which is what makes this the lead the detail spec
    // opens: a lead arriving with a summary must cost zero model calls.
    summary: {
      narrative:
        'Amara Okafor is a referral, pre-approved, and now qualified — the lender letter landed August 1. She has toured Kenilworth and liked the 1920s foursquare, and she will not compromise on District 97 schools. She is selling her current home in the spring, so timing is flexible rather than urgent.',
      nextAction:
        'Send Amara the three District 97 listings that came on this week and ask which she wants to see Saturday, while the lender letter is fresh and before the spring inventory turns over.',
      urgency: 'high',
      generatedAt: '2026-08-02T09:14:22.000Z',
      model: 'claude-opus-5',
    },
  },
  {
    id: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e003',
    firstName: 'Ben',
    lastName: 'Castellano',
    email: 'ben.castellano@example.com',
    phone: '+1 512-555-0110',
    status: 'contacted',
    budget: 220000,
    location: 'Hill County',
    // Edge case: land, so bedrooms is null — "not applicable", not zero.
    propertyType: 'land',
    bedrooms: null,
    source: 'website',
    inquiryDate: '2026-08-02',
    notes: 'Looking for 5+ acres with well access. Will build.',
    createdAt: '2026-08-02T13:44:00.000Z',
    updatedAt: '2026-08-03T10:05:00.000Z',
    // Hot, 72 = 40 recency (3 days) + 18 engagement + 3 budget (220k) + 11
    // contacted. Deliberately just over the 71 cutoff: a badge that turns the
    // wrong colour one point either side of a boundary is the bug this catches.
    activityScore: 72,
    scoreCalculatedAt: SCORED_AT,
    interactions: [
      {
        id: '8c7d6e5f-4a3b-4c2d-9e1f-0a1b2c3d0201',
        leadId: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e003',
        type: 'email',
        occurredAt: '2026-08-02T14:00:00.000Z',
        notes: 'Sent the county parcel map and the septic FAQ.',
        createdAt: '2026-08-02T14:00:00.000Z',
        updatedAt: '2026-08-02T14:00:00.000Z',
      },
      {
        id: '8c7d6e5f-4a3b-4c2d-9e1f-0a1b2c3d0202',
        leadId: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e003',
        type: 'call',
        occurredAt: '2026-08-03T10:00:00.000Z',
        notes: 'Confirmed budget is land-only; construction financed separately.',
        createdAt: '2026-08-03T10:05:00.000Z',
        updatedAt: '2026-08-03T10:05:00.000Z',
      },
    ],
    summary: {
      narrative:
        'Ben Castellano is a website lead hunting 5+ acres in Hill County with well access, intending to build. His $220K is land-only — construction is financed separately, which he confirmed by phone on August 3. He has the parcel map and the septic FAQ, so he has what he needs to shortlist.',
      nextAction:
        'Pull the three Hill County parcels over 5 acres with confirmed well permits and email them to Ben, flagging which have already passed a percolation test.',
      urgency: 'medium',
      generatedAt: '2026-08-03T11:20:00.000Z',
      model: 'claude-opus-5',
    },
  },
  {
    id: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e004',
    firstName: 'Priya',
    lastName: 'Raghunathan',
    email: 'priya.raghunathan@example.com',
    phone: '+44 20 7946 0321',
    status: 'active',
    // Edge case: no stated budget.
    budget: null,
    location: 'Downtown',
    propertyType: 'condo',
    bedrooms: 2,
    source: 'instagram',
    inquiryDate: '2026-07-11',
    notes: 'Relocating from London in Q4. Budget depends on the relocation package.',
    createdAt: '2026-07-11T08:15:00.000Z',
    updatedAt: '2026-07-24T19:12:00.000Z',
    // Warm, 52 = 26 recency (13 days) + 18 engagement + 0 budget (none stated —
    // a null budget scores nothing, unlike a stated 0) + 8 active.
    activityScore: 52,
    scoreCalculatedAt: SCORED_AT,
    interactions: [
      {
        id: '8c7d6e5f-4a3b-4c2d-9e1f-0a1b2c3d0301',
        leadId: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e004',
        type: 'email',
        occurredAt: '2026-07-11T08:40:00.000Z',
        notes: 'Auto-reply plus a shortlist of six downtown buildings.',
        createdAt: '2026-07-11T08:40:00.000Z',
        updatedAt: '2026-07-11T08:40:00.000Z',
      },
      {
        id: '8c7d6e5f-4a3b-4c2d-9e1f-0a1b2c3d0302',
        leadId: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e004',
        type: 'meeting',
        occurredAt: '2026-07-24T19:00:00.000Z',
        notes: 'Video tour of two units. Timezone difference makes evenings best.',
        createdAt: '2026-07-24T19:12:00.000Z',
        updatedAt: '2026-07-24T19:12:00.000Z',
      },
    ],
    summary: {
      narrative:
        'Priya Raghunathan is relocating from London in Q4 and is looking at 2-bed downtown condos. She has seen a shortlist of six buildings and video-toured two, but she has stated no budget — it depends on a relocation package that has not been finalised, which is the single fact blocking a real shortlist.',
      nextAction:
        'Email Priya to ask when the relocation package is confirmed and what housing allowance it includes, and offer an evening video call — the timezone difference rules out daytime.',
      urgency: 'medium',
      generatedAt: '2026-07-25T08:02:00.000Z',
      model: 'claude-opus-5',
    },
  },
  {
    id: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e005',
    firstName: 'Tomás',
    lastName: 'Herrera',
    email: 'tomas.herrera@example.com',
    phone: null,
    status: 'active',
    budget: 400000,
    // Edge case: neither location nor property type known at first contact —
    // exactly the reason those columns are nullable.
    location: null,
    propertyType: null,
    bedrooms: null,
    source: 'walk-in',
    inquiryDate: '2026-08-04',
    notes: null,
    createdAt: '2026-08-04T17:30:00.000Z',
    updatedAt: '2026-08-04T17:30:00.000Z',
    // Warm, 65 = 40 recency (2 days) + 10 engagement (1) + 7 budget (400k) + 8
    // active.
    activityScore: 65,
    scoreCalculatedAt: SCORED_AT,
    interactions: [
      {
        id: '8c7d6e5f-4a3b-4c2d-9e1f-0a1b2c3d0401',
        leadId: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e005',
        type: 'note',
        occurredAt: '2026-08-04T17:29:00.000Z',
        notes: 'Walked in off the street. Took a card, gave an email, left quickly.',
        createdAt: '2026-08-04T17:30:00.000Z',
        updatedAt: '2026-08-04T17:30:00.000Z',
      },
    ],
    // Never summarised: a walk-in with one note and no preferences recorded is
    // the thin record Task A verified the summariser handles honestly.
    summary: null,
  },
  {
    id: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e006',
    firstName: 'Elena',
    lastName: 'Petrova',
    email: 'elena.petrova@example.com',
    phone: '+1 646-555-0172',
    status: 'contacted',
    budget: 289000,
    location: 'Riverside',
    propertyType: 'condo',
    // Edge case: zero is a real value (a studio) and must not render as a dash.
    bedrooms: 0,
    source: 'realtor.com',
    inquiryDate: '2026-07-21',
    notes: 'Studio or convertible only. Investment purchase, all cash.',
    createdAt: '2026-07-21T12:05:00.000Z',
    updatedAt: '2026-07-28T09:33:00.000Z',
    // Warm, 50 = 26 recency (9 days) + 10 engagement (1) + 3 budget (289k) + 11
    // contacted.
    activityScore: 50,
    scoreCalculatedAt: SCORED_AT,
    interactions: [
      {
        id: '8c7d6e5f-4a3b-4c2d-9e1f-0a1b2c3d0501',
        leadId: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e006',
        type: 'call',
        occurredAt: '2026-07-28T09:30:00.000Z',
        notes: 'Wants rental comps before viewing anything.',
        createdAt: '2026-07-28T09:33:00.000Z',
        updatedAt: '2026-07-28T09:33:00.000Z',
      },
    ],
    summary: {
      narrative:
        'Elena Petrova is an all-cash investor after a Riverside studio or convertible, capped at $289K. She asked for rental comps before she will view anything, and that was July 28 — the comps are the one thing standing between her and a showing, and nothing has been logged since.',
      nextAction:
        'Send Elena the Riverside studio rental comps she asked for on July 28, with gross yield at her $289K cap, then propose two viewing slots this week.',
      urgency: 'medium',
      generatedAt: '2026-07-29T10:45:00.000Z',
      model: 'claude-opus-5',
    },
  },
  {
    id: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e007',
    firstName: 'Marcus',
    lastName: 'Bell',
    email: 'marcus.bell@example.com',
    phone: '+1 214-555-0163',
    status: 'lost',
    budget: 1250000,
    location: 'Uptown',
    propertyType: 'multi-family',
    bedrooms: 8,
    source: 'cold-call',
    inquiryDate: '2026-05-30',
    notes: 'Went with another brokerage. Worth re-approaching in 2027.',
    createdAt: '2026-05-30T15:00:00.000Z',
    updatedAt: '2026-07-06T11:20:00.000Z',
    // Cold, and a REAL 0 rather than a missing one: `lost` clamps the total to
    // zero whatever else is true, so the $1.25M and the June meeting count for
    // nothing. This renders as a red badge reading 0 — never an em-dash.
    activityScore: 0,
    scoreCalculatedAt: SCORED_AT,
    interactions: [
      {
        id: '8c7d6e5f-4a3b-4c2d-9e1f-0a1b2c3d0601',
        leadId: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e007',
        type: 'meeting',
        occurredAt: '2026-06-05T14:00:00.000Z',
        notes: 'Walked two eight-unit buildings. Cap rate did not work for him.',
        createdAt: '2026-06-05T17:10:00.000Z',
        updatedAt: '2026-06-05T17:10:00.000Z',
      },
      {
        id: '8c7d6e5f-4a3b-4c2d-9e1f-0a1b2c3d0602',
        leadId: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e007',
        type: 'email',
        occurredAt: '2026-07-06T11:15:00.000Z',
        notes: 'Told us he signed with a competitor.',
        createdAt: '2026-07-06T11:20:00.000Z',
        updatedAt: '2026-07-06T11:20:00.000Z',
      },
    ],
    summary: {
      narrative:
        'Marcus Bell is lost — he told us on July 6 that he signed with a competing brokerage. He was a $1.25M multi-family buyer sourced cold; the two eight-unit buildings we walked on June 5 did not clear his cap rate. The record notes he is worth re-approaching in 2027.',
      nextAction:
        'Nothing this quarter. Set a reminder for early 2027 to re-approach Marcus, and note the cap rate he needed so the next conversation opens with inventory that clears it.',
      urgency: 'low',
      generatedAt: '2026-07-07T09:00:00.000Z',
      model: 'claude-opus-5',
    },
  },
  {
    id: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e008',
    firstName: 'Yuki',
    lastName: 'Tanaka',
    email: 'yuki.tanaka@example.com',
    phone: '+1 206-555-0129',
    status: 'closed',
    budget: 890000,
    location: 'Ballard',
    propertyType: 'single-family',
    bedrooms: 3,
    source: 'referral',
    inquiryDate: '2026-06-02',
    notes: 'Closed 2026-07-30. Ask for a testimonial in September.',
    createdAt: '2026-06-02T10:00:00.000Z',
    updatedAt: '2026-07-30T22:00:00.000Z',
    // Cold, 0 by the same terminal clamp — `closed`. The 23 leads sitting at 0
    // in the live data are these two statuses.
    activityScore: 0,
    scoreCalculatedAt: SCORED_AT,
    interactions: [
      {
        id: '8c7d6e5f-4a3b-4c2d-9e1f-0a1b2c3d0701',
        leadId: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e008',
        type: 'call',
        occurredAt: '2026-06-02T10:30:00.000Z',
        notes: 'Referred by the Okafors. Ready to move immediately.',
        createdAt: '2026-06-02T10:35:00.000Z',
        updatedAt: '2026-06-02T10:35:00.000Z',
      },
      {
        id: '8c7d6e5f-4a3b-4c2d-9e1f-0a1b2c3d0702',
        leadId: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e008',
        type: 'meeting',
        occurredAt: '2026-06-20T16:00:00.000Z',
        notes: 'Offer accepted on the second showing.',
        createdAt: '2026-06-20T19:00:00.000Z',
        updatedAt: '2026-06-20T19:00:00.000Z',
      },
      {
        id: '8c7d6e5f-4a3b-4c2d-9e1f-0a1b2c3d0703',
        leadId: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e008',
        type: 'note',
        occurredAt: '2026-07-30T21:55:00.000Z',
        notes: 'Keys handed over.',
        createdAt: '2026-07-30T22:00:00.000Z',
        updatedAt: '2026-07-30T22:00:00.000Z',
      },
    ],
    summary: {
      narrative:
        'Yuki Tanaka is closed — keys were handed over July 30 on a $890K Ballard single-family, from an Okafor referral that moved fast: offer accepted on the second showing. Nothing is outstanding on the transaction itself.',
      nextAction:
        'Ask Yuki for a testimonial in September, as the record already flags, and note that this came from the Okafors so the referral is credited.',
      urgency: 'low',
      generatedAt: '2026-07-31T08:30:00.000Z',
      model: 'claude-opus-5',
    },
  },
  {
    id: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e009',
    firstName: 'Robert',
    lastName: 'Njoroge',
    email: 'robert.njoroge@example.com',
    // Edge case: every nullable column null at once, and no interactions.
    phone: null,
    status: 'qualified',
    budget: null,
    location: null,
    propertyType: 'land',
    bedrooms: null,
    source: null,
    inquiryDate: '2026-08-05',
    notes: null,
    createdAt: '2026-08-05T07:12:00.000Z',
    updatedAt: '2026-08-05T07:12:00.000Z',
    // Cold, 15, with nothing clamped: 0 recency (no interactions) + 0
    // engagement + 0 budget (none stated) + 15 qualified. A cold badge that is
    // not a terminal lead, so "cold" and "closed" cannot be conflated.
    activityScore: 15,
    scoreCalculatedAt: SCORED_AT,
    interactions: [],
    // Never summarised, and the emptiest record in the set: nothing but a name,
    // an email and a status for the card to fall back on.
    summary: null,
  },
  {
    id: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e010',
    firstName: 'Sofia',
    lastName: 'Marchetti',
    email: 'sofia.marchetti@example.com',
    phone: '+39 06 5555 0184',
    status: 'active',
    budget: 100000000,
    location: 'Lakeshore East',
    propertyType: 'multi-family',
    bedrooms: 20,
    source: 'partner-agency',
    inquiryDate: '2026-07-04',
    notes:
      'Boundary row on purpose: budget is the documented 100,000,000 ceiling and bedrooms the documented 20. If either validator is written with < instead of <=, editing this lead fails.',
    createdAt: '2026-07-04T20:45:00.000Z',
    updatedAt: '2026-07-04T20:45:00.000Z',
    // Warm, 31 — exactly the cold/warm boundary. 8 recency (33 days) + 0
    // engagement (the single note is older than the 30-day window) + 15 budget
    // (the 100M ceiling) + 8 active. One point lower and this badge is red.
    activityScore: 31,
    scoreCalculatedAt: SCORED_AT,
    interactions: [
      {
        id: '8c7d6e5f-4a3b-4c2d-9e1f-0a1b2c3d0901',
        leadId: '3f2b1c48-9d1e-4a7f-8c30-1b6a51d0e010',
        type: 'note',
        occurredAt: '2026-07-04T20:44:00.000Z',
        notes: 'Portfolio buyer introduced by the Milan office.',
        createdAt: '2026-07-04T20:45:00.000Z',
        updatedAt: '2026-07-04T20:45:00.000Z',
      },
    ],
    summary: {
      narrative:
        'Sofia Marchetti is a portfolio buyer introduced by the Milan office, working at the top of the range: $100M against 20-bedroom multi-family in Lakeshore East. The record has one note from July 4 and nothing since, so an introduction was made and no relationship has been built on it.',
      nextAction:
        'Get the Milan office to make a warm handoff call with Sofia this week and establish her acquisition criteria — unit count, target yield, and whether she is buying stabilised or value-add.',
      urgency: 'medium',
      generatedAt: '2026-07-06T12:00:00.000Z',
      model: 'claude-opus-5',
    },
  },
];

/**
 * The list endpoint's projection: `Lead[]`, with interactions AND the summary
 * dropped.
 *
 * `summary` has to go for the same reason `interactions` does, and it matters
 * more: Task A proved by curl that list rows carry no key matching /summary/i at
 * all. A fixture that left it on would let a component read `lead.summary` on the
 * list page and pass its spec against data the real API never sends.
 */
export function toListRow(detail: LeadDetail): Lead {
  const { interactions: _interactions, summary: _summary, ...lead } = detail;
  return lead;
}

/**
 * A summary for the cases a fixture cannot cover — chiefly the three urgency
 * badges, which the spec iterates rather than pinning to three specific leads.
 *
 * Overrides rather than ad-hoc literals so every summary in the suite is a real
 * `LeadSummary` and stays one when the contract changes.
 */
export function sampleSummary(overrides: Partial<LeadSummary> = {}): LeadSummary {
  return {
    narrative:
      'Rosa Sinclair has been in the pipeline three weeks with steady contact and no objection raised yet. The last call established that financing is in place and the search area is settled, so the only open question is inventory.',
    nextAction: 'Send the two new Riverside listings and ask which she wants to see this weekend.',
    urgency: 'medium',
    generatedAt: '2026-08-06T15:30:00.000Z',
    model: 'claude-opus-5',
    ...overrides,
  };
}
