import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Interaction } from '../interactions/interaction.model';
import { Lead } from '../leads/lead.model';

export interface HealthReport {
  status: 'ok';
  database: {
    connected: true;
    name: string;
    host: string;
    port: number;
    serverVersion: string;
  };
  counts: {
    leads: number;
    interactions: number;
  };
  latencyMs: number;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly config: ConfigService,
    @InjectModel(Lead) private readonly leads: typeof Lead,
    @InjectModel(Interaction) private readonly interactions: typeof Interaction,
  ) {}

  async check(): Promise<HealthReport> {
    const started = Date.now();

    await this.sequelize.authenticate();

    // Trap #6: raw queries return the literal DB column name — no camelCase
    // aliasing, unlike model finders. `SHOW server_version` yields a
    // `server_version` key, so alias it explicitly or the field silently
    // arrives as undefined and JSON.stringify drops it from the response.
    const [{ version }] = await this.sequelize.query<{ version: string }>(
      `SELECT current_setting('server_version') AS version`,
      { type: QueryTypes.SELECT },
    );

    const [leads, interactions] = await Promise.all([
      this.leads.count(),
      this.interactions.count(),
    ]);

    return {
      status: 'ok',
      database: {
        connected: true,
        name: this.config.getOrThrow<string>('DB_NAME'),
        host: this.config.getOrThrow<string>('DB_HOST'),
        port: Number(this.config.getOrThrow<number>('DB_PORT')),
        serverVersion: version,
      },
      counts: { leads, interactions },
      latencyMs: Date.now() - started,
    };
  }
}
