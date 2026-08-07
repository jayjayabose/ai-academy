import type { Lead, LeadDetail } from '@ai-academy/shared';

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
 *
 * Row order is deliberately NOT inquiryDate-descending, so the list's default
 * sort is actually doing something.
 */
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
    // Edge case: a brand new lead nobody has contacted yet.
    interactions: [],
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
    interactions: [],
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
  },
];

/** The list endpoint's projection: `Lead[]`, with interactions dropped. */
export function toListRow(detail: LeadDetail): Lead {
  const { interactions: _interactions, ...lead } = detail;
  return lead;
}
