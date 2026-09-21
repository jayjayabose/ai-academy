import type {
  Interaction as InteractionResource,
  Lead as LeadResource,
  LeadDetail,
  LeadSummary,
} from '@ai-academy/shared';
import type { Interaction } from '../interactions/interaction.model';
import type { Lead } from './lead.model';

/**
 * Model instances -> wire shapes.
 *
 * Until Day 2 the services returned model instances and let JSON.stringify do
 * this implicitly. That was already loose — `findOne` was typed `Promise<Lead>`
 * while the controller comment claimed `LeadDetail` — and migration 002 makes it
 * WRONG. The five summary columns are on the Lead model, so Sequelize selects
 * them on every query, including the list query; the wire `Lead` type has no
 * summary fields. Implicit serialisation would put `summaryNarrative` and
 * friends on every row of GET /api/leads and break the contract silently, with
 * no error and no failing type check anywhere.
 *
 * So the mapping is explicit and total: `toLead` names the fields a list row
 * carries, which means a new column is invisible to the wire until somebody adds
 * it here on purpose. That is the whole point — an allowlist, not
 * `attributes: { exclude: [...] }`, which is the same allowlist written where a
 * future column can quietly slip past it.
 */

export function toLead(lead: Lead): LeadResource {
  return {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    status: lead.status,
    budget: lead.budget,
    location: lead.location,
    propertyType: lead.propertyType,
    bedrooms: lead.bedrooms,
    source: lead.source,
    // DATEONLY, so Sequelize already hands back 'YYYY-MM-DD'.
    inquiryDate: lead.inquiryDate,
    notes: lead.notes,
    // On a LIST row, unlike the summary: the dashboard's default sort is this
    // number, so every row has to carry it. The pair is written together and
    // `leads_activity_score_complete_check` enforces that, so the timestamp is
    // mapped off its own null rather than off the score's — two independent
    // `?:` for a pair that cannot disagree, which reads as belt-and-braces and
    // is really just the compiler being told what the constraint already knows.
    activityScore: lead.activityScore,
    scoreCalculatedAt: lead.scoreCalculatedAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

/**
 * `LeadDetail` = a list row plus history plus the summary.
 *
 * `interactions` is optional on the model (it is populated only by the detail
 * query's `include`), but the contract promises an array — `[]` for a lead with
 * no history, never absent.
 */
export function toLeadDetail(lead: Lead): LeadDetail {
  return {
    ...toLead(lead),
    interactions: (lead.interactions ?? []).map(toInteraction),
    summary: toSummary(lead),
  };
}

function toInteraction(interaction: Interaction): InteractionResource {
  return {
    id: interaction.id,
    leadId: interaction.leadId,
    type: interaction.type,
    occurredAt: interaction.occurredAt.toISOString(),
    notes: interaction.notes,
    createdAt: interaction.createdAt.toISOString(),
    updatedAt: interaction.updatedAt.toISOString(),
  };
}

/**
 * The five columns collapse back into one object, or into null.
 *
 * `leads_summary_complete_check` (migration 002) guarantees the columns are all
 * populated or all NULL, so testing one would be enough at runtime. All five are
 * tested anyway, because that is also what narrows the types — `LeadSummary` has
 * no optional fields, and the alternative is five non-null assertions telling
 * the compiler to trust a constraint it cannot see.
 */
export function toSummary(lead: Lead): LeadSummary | null {
  if (
    lead.summaryNarrative === null ||
    lead.summaryNextAction === null ||
    lead.summaryUrgency === null ||
    lead.summaryGeneratedAt === null ||
    lead.summaryModel === null
  ) {
    return null;
  }

  return {
    narrative: lead.summaryNarrative,
    nextAction: lead.summaryNextAction,
    urgency: lead.summaryUrgency,
    generatedAt: lead.summaryGeneratedAt.toISOString(),
    model: lead.summaryModel,
  };
}
