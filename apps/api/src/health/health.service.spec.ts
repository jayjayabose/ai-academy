import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/sequelize';
import { Test } from '@nestjs/testing';
import { Sequelize } from 'sequelize-typescript';
import { Interaction } from '../interactions/interaction.model';
import { Lead } from '../leads/lead.model';
import { HealthService } from './health.service';

/**
 * Unit tier: every collaborator is a mock, so this runs with Docker stopped.
 *
 * What it can prove is the assembly — that the report is built from the pieces
 * the service was handed. Anything that depends on what Postgres actually
 * returns is unprovable here, because the mock decides the answer; those
 * questions belong to health.service.integration.spec.ts. Chapter 02's whole
 * argument is that the two tiers answer different questions.
 */

const ENV: Record<string, string> = {
  DB_NAME: 'crm_dev',
  DB_HOST: 'localhost',
  DB_PORT: '5433',
};

describe('the database health report', () => {
  let service: HealthService;
  let sequelize: { authenticate: jest.Mock; query: jest.Mock };
  let leads: { count: jest.Mock };
  let interactions: { count: jest.Mock };

  beforeEach(async () => {
    sequelize = {
      authenticate: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue([{ version: '16.10' }]),
    };
    leads = { count: jest.fn().mockResolvedValue(3) };
    interactions = { count: jest.fn().mockResolvedValue(7) };

    const module = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: Sequelize, useValue: sequelize },
        {
          provide: ConfigService,
          useValue: { getOrThrow: (key: string) => ENV[key] },
        },
        { provide: getModelToken(Lead), useValue: leads },
        { provide: getModelToken(Interaction), useValue: interactions },
      ],
    }).compile();

    service = module.get(HealthService);
  });

  it('names the connection it checked and the rows it found', async () => {
    const report = await service.check();

    expect(report).toMatchObject({
      database: { name: 'crm_dev', host: 'localhost' },
      counts: { leads: 3, interactions: 7 },
    });
  });

  it('reports the port as a number, not the string the environment supplies', async () => {
    // ConfigService hands back the raw string from .env.local. The wire contract
    // says `port: number`, and JSON.stringify would happily publish "5433".
    const { port } = (await service.check()).database;

    expect(port).toBe(5433);
  });

  describe('when the database connection cannot be established', () => {
    beforeEach(() => {
      sequelize.authenticate.mockRejectedValue(new Error('ECONNREFUSED'));
      // A dead connection fails the counts too. Arranging that is what makes the
      // assertion below meaningful: it says the caller sees the CAUSE, not
      // whichever downstream call happened to blow up second.
      leads.count.mockRejectedValue(
        new Error('Connection terminated unexpectedly'),
      );
      interactions.count.mockRejectedValue(
        new Error('Connection terminated unexpectedly'),
      );
    });

    it('surfaces the connection failure rather than a downstream one', async () => {
      await expect(service.check()).rejects.toThrow('ECONNREFUSED');
    });
  });
});
