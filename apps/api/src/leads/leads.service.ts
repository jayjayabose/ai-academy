import type {
  Lead as LeadResource,
  LeadDetail,
  LeadSummary,
} from '@ai-academy/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Interaction } from '../interactions/interaction.model';
import { SummariesService } from '../summaries/summaries.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { toLead, toLeadDetail, toSummary } from './lead-wire';
import { Lead } from './lead.model';

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead) private readonly leads: typeof Lead,
    private readonly summaries: SummariesService,
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
    const leads = await this.leads.findAll({
      order: [
        ['inquiryDate', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });

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
