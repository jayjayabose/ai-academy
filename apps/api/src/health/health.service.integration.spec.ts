import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/sequelize';
import { Test } from '@nestjs/testing';
import {
  setupTestDatabase,
  teardownTestDatabase,
  truncateAll,
} from '@test/helpers';
import { Sequelize } from 'sequelize-typescript';
import { Interaction } from '../interactions/interaction.model';
import { Lead } from '../leads/lead.model';
import { HealthService } from './health.service';

/**
 * The counterpart to health.service.spec.ts, and the only tier that can answer
 * these two questions — in the unit tier the mock decides what Postgres
 * "returns", so it can confirm the report was assembled but never that the
 * values in it are real.
 *
 * The version assertion is the standing guard on Trap #6. The first
 * implementation read `version` from `SHOW server_version`, whose column is
 * actually named `server_version`; the field came back undefined and
 * JSON.stringify dropped it from the response with no error anywhere. Any
 * regression to an unaliased raw query fails here.
 */
describe('the database health report, against Postgres', () => {
  let service: HealthService;

  beforeAll(async () => {
    const connection = await setupTestDatabase();

    const module = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: Sequelize, useValue: connection },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) =>
              key === 'DB_NAME' ? process.env.DB_TEST_NAME : process.env[key],
          },
        },
        { provide: getModelToken(Lead), useValue: Lead },
        { provide: getModelToken(Interaction), useValue: Interaction },
      ],
    }).compile();

    service = module.get(HealthService);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  it('reports the version Postgres is actually running', async () => {
    const { serverVersion } = (await service.check()).database;

    expect(serverVersion).toMatch(/^\d+\.\d+/);
  });

  it('counts the rows that are really in the database', async () => {
    const lead = await Lead.create({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      inquiryDate: '2026-08-07',
    });
    await Interaction.create({
      leadId: lead.id,
      type: 'call',
      occurredAt: new Date(),
    });

    const { counts } = await service.check();

    expect(counts).toEqual({ leads: 1, interactions: 1 });
  });
});
