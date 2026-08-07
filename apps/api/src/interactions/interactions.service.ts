import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { CreationAttributes } from 'sequelize';
import { LeadsService } from '../leads/leads.service';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { Interaction } from './interaction.model';

@Injectable()
export class InteractionsService {
  constructor(
    @InjectModel(Interaction) private readonly interactions: typeof Interaction,
    private readonly leads: LeadsService,
  ) {}

  /**
   * The lead is checked first, so posting under an unknown id is a 404 rather
   * than a 500 wrapping a foreign-key violation. `findOneOrFail` is reused so
   * there is exactly one "Lead not found" message in the codebase.
   */
  async create(
    leadId: string,
    dto: CreateInteractionDto,
  ): Promise<Interaction> {
    await this.leads.findOneOrFail(leadId);

    return this.interactions.create(this.toAttributes(leadId, dto));
  }

  /**
   * The one place the wire contract and the column type disagree: `occurredAt`
   * travels as an ISO 8601 string (contract §2 — timestamps are strings on the
   * wire) and the column is TIMESTAMPTZ, so it is converted here rather than
   * relying on Sequelize to coerce a string it never promised to accept.
   *
   * Absent fields are LEFT OUT rather than set to undefined, because that is what
   * lets the column DEFAULTs apply — `occurredAt` omitted means now().
   */
  private toAttributes(
    leadId: string,
    dto: CreateInteractionDto,
  ): CreationAttributes<Interaction> {
    const attributes: CreationAttributes<Interaction> = {
      leadId,
      type: dto.type,
    };

    if (dto.occurredAt !== undefined) {
      attributes.occurredAt = new Date(dto.occurredAt);
    }

    if (dto.notes !== undefined) {
      attributes.notes = dto.notes;
    }

    return attributes;
  }
}
