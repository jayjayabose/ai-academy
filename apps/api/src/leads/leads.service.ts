import type {
  Lead as LeadResource,
  LeadDetail,
  LeadSummary,
} from '@ai-academy/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Order } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Interaction } from '../interactions/interaction.model';
import { scoreLead } from '../scoring/activity-score';
import { SummariesService } from '../summaries/summaries.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { toLead, toLeadDetail, toSummary } from './lead-wire';
import { Lead } from './lead.model';

/**
 * The list order, in one place because two methods promise it.
 *
 * `findAll` needs it because an unordered SELECT has no guaranteed order in
 * Postgres, and `rescoreAll` needs the SAME one because R3 says the bulk
 * recalculation returns rows in the order GET /api/leads returns them — the
 * client replaces its table wholesale from that response. Inlining it twice
 * would let the two drift, and the symptom would be a table that reshuffles
 * only after the Recalculate button.
 *
 * Note this is the SERVER's order, which is not the dashboard's default sort.
 * Sorting by score is the client's job (R4); the server's job is to be
 * deterministic.
 */
const LIST_ORDER: Order = [
  ['inquiryDate', 'DESC'],
  ['createdAt', 'DESC'],
];

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead) private readonly leads: typeof Lead,
    private readonly summaries: SummariesService,
    private readonly sequelize: Sequelize,
  ) {}

  /**
   * Full `Lead` rows, not a projection: 100 rows x ~250 B is ~25 KB, and a
   * projection costs a second type to keep in sync while saving nothing
   * measurable (contract §1).
   *
   * Ordered even though the client sorts client-side — an unordered SELECT has no
   * guaranteed order in Postgres, so without this the list quietly reshuffles
   * between requests.
   *
   * `toLead` is what keeps the summary columns off these rows. The model selects
   * them; the wire `Lead` type has no room for them. See lead-wire.ts.
   */
  async findAll(): Promise<LeadResource[]> {
    const leads = await this.leads.findAll({ order: LIST_ORDER });

    return leads.map(toLead);
  }

  /** `LeadDetail`: interactions and the summary embedded, so the detail page is never a second round trip. */
  async findOne(id: string): Promise<LeadDetail> {
    return toLeadDetail(await this.findOneWithInteractions(id));
  }

  async create(dto: CreateLeadDto): Promise<LeadResource> {
    // The DTO has already dropped unknown properties (whitelist) and normalised
    // email, so it is safe to hand over whole. Omitted optional fields stay
    // omitted, which is what lets the column DEFAULTs apply.
    return toLead(await this.leads.create({ ...dto }));
  }

  async update(id: string, dto: UpdateLeadDto): Promise<LeadResource> {
    const lead = await this.findOneOrFail(id);

    // `{}` is a legitimate no-op PATCH; `update` with no keys is a no-op too.
    return toLead(await lead.update({ ...dto }));
  }

  async remove(id: string): Promise<void> {
    const lead = await this.findOneOrFail(id);

    // Interactions go with it: ON DELETE CASCADE in migration 001.
    await lead.destroy();
  }

  /**
   * Generates a summary and persists it, replacing any previous one.
   *
   * `generatedAt` is stamped here with `new Date()` rather than taken from the
   * model. It is provenance — when the server produced this — and a model-authored
   * timestamp would be a guess dressed up as a fact.
   *
   * All five columns are written in one UPDATE, which is what
   * `leads_summary_complete_check` requires: writing them one at a time would
   * trip the constraint on the first statement.
   *
   * Deliberately NOT idempotent. Re-posting regenerates, because the whole point
   * of the button is "this looks stale, do it again". Summaries are also not
   * invalidated when the lead or its interactions change — explicitly out of
   * scope for Day 2, which is why `generatedAt` is on the wire at all.
   */
  async summarize(id: string): Promise<LeadSummary> {
    const lead = await this.findOneWithInteractions(id);

    const generated = await this.summaries.generate(
      lead,
      lead.interactions ?? [],
    );

    await lead.update({
      summaryNarrative: generated.narrative,
      summaryNextAction: generated.nextAction,
      summaryUrgency: generated.urgency,
      summaryGeneratedAt: new Date(),
      summaryModel: generated.model,
    });

    const summary = toSummary(lead);

    if (!summary) {
      // Unreachable: the update above wrote all five columns, and the CHECK
      // would have rejected the row otherwise. Asserting it beats a non-null
      // assertion, which would silently return `undefined` if this ever changed.
      throw new Error(`Summary for lead ${id} was not persisted`);
    }

    return summary;
  }

  /**
   * Recomputes one lead's activity score and persists it.
   *
   * Both columns go in ONE update, which is what
   * `leads_activity_score_complete_check` requires: writing the score and then
   * the timestamp would trip the constraint on the first statement.
   *
   * `scoreCalculatedAt` is stamped here with `new Date()`, never taken from the
   * caller. It is provenance — when the SERVER computed this — and a
   * client-supplied timestamp would be a claim rather than a fact. Same
   * reasoning as `summarize`.
   *
   * Returns the whole `Lead` rather than just the score (R3). Both fields live
   * on `Lead` itself, unlike `LeadSummary` which is its own nested object, so
   * returning the row means no new wire type and no object surgery on the
   * client. The cost is that this is shaped differently from
   * POST /:id/summary, which returns just the summary.
   */
  async rescore(id: string): Promise<LeadResource> {
    const lead = await this.findOneWithInteractions(id);

    await lead.update(scoreColumns(lead, new Date()));

    return toLead(lead);
  }

  /**
   * Recomputes the whole book, in one transaction, returned in `findAll`'s
   * order so the client can replace its table wholesale.
   *
   * ONE query for the leads AND their interactions — a hasMany `include`, not a
   * findAll followed by a lookup per lead. The N+1 version reads fine and costs
   * 101 round trips; at 100 leads and ~3.5 interactions each this is a single
   * join returning roughly 350 rows.
   *
   * The WRITES are still one UPDATE per lead, issued sequentially. Sequelize
   * serialises a transaction onto one connection, so `Promise.all` here would
   * interleave statements on a connection that cannot take them. A single
   * `UPDATE ... FROM (VALUES ...)` would be one round trip instead of a
   * hundred, and is the thing to reach for if this ever shows up in a trace —
   * it is not reached for now because 100 UPDATEs inside one transaction
   * measure in the tens of milliseconds and hand-built VALUES lists are how
   * type confusion gets into SQL.
   *
   * One `now` for every row: a bulk recalculation happened at one instant, and
   * stamping each row with its own `new Date()` would make the timestamps
   * disagree about an event that did not.
   */
  async rescoreAll(): Promise<LeadResource[]> {
    const now = new Date();

    return this.sequelize.transaction(async (transaction) => {
      const leads = await this.leads.findAll({
        include: [{ model: Interaction }],
        order: LIST_ORDER,
        transaction,
      });

      for (const lead of leads) {
        await lead.update(scoreColumns(lead, now), { transaction });
      }

      return leads.map(toLead);
    });
  }

  /** Existence check without the interactions include — used by mutations and by InteractionsService. */
  async findOneOrFail(id: string): Promise<Lead> {
    const lead = await this.leads.findByPk(id);

    if (!lead) {
      throw new NotFoundException(`Lead ${id} not found`);
    }

    return lead;
  }

  /** The detail read, shared by `findOne` and `summarize` — one query, one 404 message. */
  private async findOneWithInteractions(id: string): Promise<Lead> {
    const lead = await this.leads.findByPk(id, {
      include: [{ model: Interaction }],
      order: [
        [{ model: Interaction, as: 'interactions' }, 'occurredAt', 'DESC'],
      ],
    });

    if (!lead) {
      throw new NotFoundException(`Lead ${id} not found`);
    }

    return lead;
  }
}

/**
 * The two columns, always together.
 *
 * A named helper rather than two inline properties at each call site, because
 * "always together" is exactly what the CHECK constraint enforces and a helper
 * is harder to half-use than an object literal.
 */
function scoreColumns(
  lead: Lead,
  now: Date,
): Pick<Lead, 'activityScore' | 'scoreCalculatedAt'> {
  return {
    activityScore: scoreLead(lead, lead.interactions ?? [], now),
    scoreCalculatedAt: now,
  };
}
