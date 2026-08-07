import { getModelToken } from '@nestjs/sequelize';
import { Test } from '@nestjs/testing';
import {
  setupTestDatabase,
  teardownTestDatabase,
  truncateAll,
} from '@test/helpers';
import { join } from 'node:path';
import { Sequelize } from 'sequelize-typescript';
import { Interaction } from '../../interactions/interaction.model';
import { Lead } from '../../leads/lead.model';
import { SeedService } from './seed.service';

/**
 * The CSV import, against the real schema.
 *
 * The unit tier already covers what a row becomes (lead-csv.spec.ts) and what a
 * history looks like (interaction-generator.spec.ts). What only Postgres can
 * answer is whether those rows survive the constraints, whether an empty cell
 * really lands as NULL, and whether the transaction holds when an insert fails.
 */

const SAMPLE_CSV = join(
  __dirname,
  '../../../test/fixtures/seed-leads.sample.csv',
);
const OVERLONG_NAME_CSV = join(
  __dirname,
  '../../../test/fixtures/seed-leads.overlong-name.csv',
);
const SAMPLE_ROWS = 3;
const NOW = new Date('2026-08-07T12:00:00Z');

describe('importing the seed CSV', () => {
  let service: SeedService;

  beforeAll(async () => {
    const connection = await setupTestDatabase();

    const module = await Test.createTestingModule({
      providers: [
        SeedService,
        { provide: Sequelize, useValue: connection },
        { provide: getModelToken(Lead), useValue: Lead },
        { provide: getModelToken(Interaction), useValue: Interaction },
      ],
    }).compile();

    service = module.get(SeedService);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  describe('into an empty database', () => {
    it('inserts every row in the file', async () => {
      const result = await service.seed({ csvPath: SAMPLE_CSV, now: NOW });

      expect(result).toMatchObject({ outcome: 'seeded', leads: SAMPLE_ROWS });
      expect(await Lead.count()).toBe(SAMPLE_ROWS);
    });

    it('gives every lead a history of two to five interactions', async () => {
      await service.seed({ csvPath: SAMPLE_CSV, now: NOW });

      const perLead = await Promise.all(
        (await Lead.findAll()).map((lead) =>
          Interaction.count({ where: { leadId: lead.id } }),
        ),
      );

      expect(perLead).toHaveLength(SAMPLE_ROWS);
      expect(perLead.every((count) => count >= 2 && count <= 5)).toBe(true);
    });

    it('stores an absent cell as NULL, not an empty string', async () => {
      // The `land` row leaves phone, budget, location, bedrooms, source and notes
      // empty. `''` would satisfy the NOT NULL columns and quietly break every
      // `IS NULL` query written against them afterwards.
      await service.seed({ csvPath: SAMPLE_CSV, now: NOW });

      const lead = await Lead.findOne({ where: { propertyType: 'land' } });

      expect(lead).toMatchObject({
        phone: null,
        budget: null,
        location: null,
        bedrooms: null,
        source: null,
        notes: null,
      });
    });

    it('stores budget as a number, the way the wire contract promises', async () => {
      // Round-trip through the pg driver, which is the only place this can be
      // confirmed — INTEGER comes back as a number, NUMERIC and BIGINT as strings.
      await service.seed({ csvPath: SAMPLE_CSV, now: NOW });

      const lead = await Lead.findOne({
        where: { email: 'ada.lovelace@example.com' },
      });

      expect(lead?.budget).toBe(480000);
    });
  });

  describe('when the database already holds leads', () => {
    beforeEach(async () => {
      await service.seed({ csvPath: SAMPLE_CSV, now: NOW });
    });

    it('changes nothing and says which command would', async () => {
      // Additive, per the script contract: `npm run setup` calls db:seed, so a
      // second run must not duplicate 100 leads — email is deliberately
      // non-unique, so there is nothing to upsert on.
      const result = await service.seed({ csvPath: SAMPLE_CSV, now: NOW });

      expect(result).toEqual({
        outcome: 'skipped',
        existingLeads: SAMPLE_ROWS,
      });
      expect(await Lead.count()).toBe(SAMPLE_ROWS);
    });

    it('replaces rather than appends when asked for a fresh seed', async () => {
      const result = await service.seed({
        csvPath: SAMPLE_CSV,
        now: NOW,
        fresh: true,
      });

      expect(result).toMatchObject({ outcome: 'seeded', truncated: true });
      expect(await Lead.count()).toBe(SAMPLE_ROWS);
    });

    it('takes the old interactions with the old leads', async () => {
      // TRUNCATE ... CASCADE. Without CASCADE the FK would block it; without the
      // cascade reaching interactions, the second seed would leave orphans.
      const before = await Interaction.count();

      await service.seed({ csvPath: SAMPLE_CSV, now: NOW, fresh: true });

      expect(await Interaction.count()).toBe(before);
    });
  });

  describe('when a row is rejected by the schema', () => {
    it('leaves the existing data untouched', async () => {
      // The reason TRUNCATE runs INSIDE the transaction. The fixture's second row
      // has a 150-character firstName against VARCHAR(100), so the insert fails
      // after the truncate has already run. If the two were not in one
      // transaction, a failed `db:seed:fresh` would delete everything and put
      // nothing back.
      await service.seed({ csvPath: SAMPLE_CSV, now: NOW });
      const before = await Lead.count();

      await expect(
        service.seed({ csvPath: OVERLONG_NAME_CSV, now: NOW, fresh: true }),
      ).rejects.toThrow();

      expect(await Lead.count()).toBe(before);
    });
  });

  describe('the committed seed-leads.csv', () => {
    it('imports against the real schema', async () => {
      // Not a fixture: the actual file a fresh clone seeds from. Nothing else
      // checks that its 100 rows satisfy the constraints migration 001 creates,
      // and the failure mode is `npm run setup` breaking for a new arrival.
      const result = await service.seed({ now: NOW });

      expect(result).toMatchObject({ outcome: 'seeded', leads: 100 });
      expect(await Interaction.count()).toBe(
        (result as { interactions: number }).interactions,
      );
    });
  });
});
