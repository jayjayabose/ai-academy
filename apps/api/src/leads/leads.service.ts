import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Interaction } from '../interactions/interaction.model';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { Lead } from './lead.model';

@Injectable()
export class LeadsService {
  constructor(@InjectModel(Lead) private readonly leads: typeof Lead) {}

  /**
   * Full `Lead` rows, not a projection: 100 rows x ~250 B is ~25 KB, and a
   * projection costs a second type to keep in sync while saving nothing
   * measurable (contract §1).
   *
   * Ordered even though the client sorts client-side — an unordered SELECT has no
   * guaranteed order in Postgres, so without this the list quietly reshuffles
   * between requests.
   */
  findAll(): Promise<Lead[]> {
    return this.leads.findAll({
      order: [
        ['inquiryDate', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });
  }

  /** `LeadDetail`: interactions embedded, so the detail page is never a second round trip. */
  async findOne(id: string): Promise<Lead> {
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

  create(dto: CreateLeadDto): Promise<Lead> {
    // The DTO has already dropped unknown properties (whitelist) and normalised
    // email, so it is safe to hand over whole. Omitted optional fields stay
    // omitted, which is what lets the column DEFAULTs apply.
    return this.leads.create({ ...dto });
  }

  async update(id: string, dto: UpdateLeadDto): Promise<Lead> {
    const lead = await this.findOneOrFail(id);

    // `{}` is a legitimate no-op PATCH; `update` with no keys is a no-op too.
    return lead.update({ ...dto });
  }

  async remove(id: string): Promise<void> {
    const lead = await this.findOneOrFail(id);

    // Interactions go with it: ON DELETE CASCADE in migration 001.
    await lead.destroy();
  }

  /** Existence check without the interactions include — used by mutations and by InteractionsService. */
  async findOneOrFail(id: string): Promise<Lead> {
    const lead = await this.leads.findByPk(id);

    if (!lead) {
      throw new NotFoundException(`Lead ${id} not found`);
    }

    return lead;
  }
}
