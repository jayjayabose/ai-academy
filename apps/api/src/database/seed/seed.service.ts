import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Interaction } from '../../interactions/interaction.model';
import { Lead } from '../../leads/lead.model';
import { generateInteractions } from './interaction-generator';
import { readSeedLeads } from './lead-csv';

export interface SeedOptions {
  /** TRUNCATE before inserting. Only `db:seed:fresh` passes this. */
  fresh?: boolean;
  /** Overridable so tests can point at a small fixture instead of the 100-row file. */
  csvPath?: string;
  /** Injected so generated history is never dated in the future. */
  now?: Date;
}

export type SeedResult =
  | { outcome: 'skipped'; existingLeads: number }
  | {
      outcome: 'seeded';
      leads: number;
      interactions: number;
      truncated: boolean;
    };

/**
 * Decision 13. Writes via `bulkCreate` on the models inside ONE transaction —
 * deliberately not through LeadsService. An earlier draft argued for routing the
 * import through the service so business rules could not diverge; there are no
 * business rules there to protect. Validation lives in the DTOs, which a file
 * importer bypasses by design, and the real guard is the database constraints.
 * 450 individual service calls would buy nothing and cost a lot.
 */
@Injectable()
export class SeedService {
  constructor(
    private readonly sequelize: Sequelize,
    @InjectModel(Lead) private readonly leads: typeof Lead,
    @InjectModel(Interaction) private readonly interactions: typeof Interaction,
  ) {}

  async seed(options: SeedOptions = {}): Promise<SeedResult> {
    const { fresh = false, csvPath, now = new Date() } = options;

    // The emptiness check stands in for an idempotency key: `email` is
    // deliberately non-unique (couples share an address), so a second additive
    // seed would insert 100 duplicates rather than upserting. Skipping instead
    // of failing is what keeps `npm run setup` re-runnable.
    if (!fresh) {
      const existingLeads = await this.leads.count();

      if (existingLeads > 0) {
        return { outcome: 'skipped', existingLeads };
      }
    }

    const rows = readSeedLeads(csvPath);

    return this.sequelize.transaction(async (transaction) => {
      if (fresh) {
        // CASCADE reaches interactions. Inside the transaction, so a failure
        // during insert leaves the existing data untouched rather than deleted.
        await this.sequelize.query('TRUNCATE TABLE leads CASCADE', {
          transaction,
        });
      }

      const created = await this.leads.bulkCreate(rows, { transaction });

      const history = created.flatMap((lead, index) =>
        generateInteractions(
          { id: lead.id, inquiryDate: lead.inquiryDate },
          index,
          now,
        ),
      );

      await this.interactions.bulkCreate(history, { transaction });

      return {
        outcome: 'seeded',
        leads: created.length,
        interactions: history.length,
        truncated: fresh,
      };
    });
  }
}
