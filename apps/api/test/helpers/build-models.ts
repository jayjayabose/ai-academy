import type { CreationAttributes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { User } from '../../src/auth/user.model';
import { Interaction } from '../../src/interactions/interaction.model';
import { Lead } from '../../src/leads/lead.model';

/**
 * Unsaved Lead and Interaction instances for the unit tier.
 *
 * `Model.build()` needs its model attached to a Sequelize instance, so one is
 * created here — but it never connects. Sequelize opens a connection lazily, on
 * the first query, and nothing here queries. So this stays inside the unit
 * tier's rule: `npm test` passes with Docker stopped.
 *
 * Real instances rather than hand-rolled object literals, because the code under
 * test reads Date fields and calls `.toISOString()` on them. A literal cast to
 * `Lead` would let a wrong type through the exact place these tests exist to
 * check.
 */
/**
 * Constructing this is the whole job: passing `models` is what calls Model.init
 * on each class, which is what makes `build()` legal. Exported rather than
 * discarded so it is not an unused binding.
 */
export const modelRegistry = new Sequelize({
  dialect: 'postgres',
  models: [Lead, Interaction, User],
  // Must match database.module.ts, or `build()` maps attributes to the wrong
  // column names — harmless here, since nothing is written, but misleading.
  define: { underscored: true },
  logging: false,
});

const LEAD_DEFAULTS = {
  id: '9b0b8e2a-0000-4000-8000-000000000001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '(303) 555-0193',
  status: 'qualified',
  budget: 480000,
  location: 'Littleton',
  propertyType: 'condo',
  bedrooms: 2,
  source: 'website',
  inquiryDate: '2026-06-05',
  notes: 'Wants a south-facing balcony.',
  summaryNarrative: null,
  summaryNextAction: null,
  summaryUrgency: null,
  summaryGeneratedAt: null,
  summaryModel: null,
  activityScore: null,
  scoreCalculatedAt: null,
  createdAt: new Date('2026-06-05T09:00:00.000Z'),
  updatedAt: new Date('2026-06-05T09:00:00.000Z'),
} satisfies CreationAttributes<Lead>;

export function buildLead(
  overrides: Partial<CreationAttributes<Lead>> = {},
): Lead {
  return Lead.build({ ...LEAD_DEFAULTS, ...overrides });
}

/** A lead as a salesperson leaves it mid-phone-call: identity, and nothing else. */
export function buildThinLead(): Lead {
  return buildLead({
    phone: null,
    budget: null,
    location: null,
    propertyType: null,
    bedrooms: null,
    source: null,
    notes: null,
    status: 'active',
  });
}

export function buildInteraction(
  overrides: Partial<CreationAttributes<Interaction>> = {},
): Interaction {
  return Interaction.build({
    id: '9b0b8e2a-0000-4000-8000-000000000101',
    leadId: LEAD_DEFAULTS.id,
    type: 'call',
    occurredAt: new Date('2026-07-01T10:00:00.000Z'),
    notes: 'Talked through the two Littleton listings.',
    createdAt: new Date('2026-07-01T10:05:00.000Z'),
    updatedAt: new Date('2026-07-01T10:05:00.000Z'),
    ...overrides,
  });
}
