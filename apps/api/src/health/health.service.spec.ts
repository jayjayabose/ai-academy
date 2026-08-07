import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/sequelize';
import { Test } from '@nestjs/testing';
import { Sequelize } from 'sequelize-typescript';
import { Interaction } from '../interactions/interaction.model';
import { Lead } from '../leads/lead.model';
import { HealthService } from './health.service';

/**
 * Unit test: every collaborator is a mock, so this runs with Docker stopped.
 *
 * What it can prove is the assembly — that the report is built from the pieces
 * the service was handed. What it cannot prove is anything about the real
 * database; chapter 02's whole argument is that these two tiers answer
 * different questions. The counterpart lives in the `integration` project.
 */

const ENV: Record<string, string> = {
  DB_NAME: 'crm_dev',
  DB_HOST: 'localhost',
  DB_PORT: '5433',
};

describe('HealthService', () => {
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

  it('reports the configured connection and the row counts', async () => {
    const report = await service.check();

    expect(report).toMatchObject({
      status: 'ok',
      database: {
        connected: true,
        name: 'crm_dev',
        host: 'localhost',
        serverVersion: '16.10',
      },
      counts: { leads: 3, interactions: 7 },
    });
  });

  it('coerces DB_PORT to a number', async () => {
    // ConfigService hands back the raw string from .env.local. The wire contract
    // says `port: number`, and JSON.stringify would happily publish "5433".
    const { port } = (await service.check()).database;

    expect(port).toBe(5433);
  });

  it('aliases the server_version column explicitly', async () => {
    // Trap #6, white-box on purpose. Raw queries return the literal column
    // name — `SHOW server_version` yields a `server_version` key, so reading
    // `version` off it gives undefined and JSON.stringify drops the field with
    // no error anywhere. That exact bug shipped once. Asserting on the SQL text
    // is the only way a mocked test can catch its return: any mock that returns
    // `{ version }` satisfies the assembly test above regardless of the query.
    await service.check();

    expect(sequelize.query).toHaveBeenCalledWith(
      expect.stringMatching(/AS version/i),
      expect.anything(),
    );
  });

  it('does not report ok when the connection check fails', async () => {
    sequelize.authenticate.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(service.check()).rejects.toThrow('ECONNREFUSED');
    // Counting rows on a dead connection would replace the useful error with a
    // second, less informative one.
    expect(leads.count).not.toHaveBeenCalled();
  });
});
