import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Smoke } from '../database/smoke.model';

export interface HealthReport {
    status: 'ok';
    database: {
        connected: true;
        name: string;
        host: string;
        port: number;
        serverVersion: string;
    };
    /** Throwaway — removed with the smoke migration once migration 001 lands. */
    smoke: {
        insertedId: number;
        rowCount: number;
        /** camelCase attribute read back from a snake_case column (Decision 4). */
        createdAt: Date;
    };
    latencyMs: number;
}

@Injectable()
export class HealthService {
    constructor(
        private readonly sequelize: Sequelize,
        private readonly config: ConfigService,
        @InjectModel(Smoke) private readonly smoke: typeof Smoke,
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

        // A real write + read round-trip through a migration-created table.
        // `label` and `createdAt` are camelCase attributes over snake_case columns.
        const inserted = await this.smoke.create({ label: 'health-check' } as Smoke);
        const rowCount = await this.smoke.count();

        return {
            status: 'ok',
            database: {
                connected: true,
                name: this.config.getOrThrow<string>('DB_NAME'),
                host: this.config.getOrThrow<string>('DB_HOST'),
                port: Number(this.config.getOrThrow<number>('DB_PORT')),
                serverVersion: version,
            },
            smoke: {
                insertedId: inserted.id,
                rowCount,
                createdAt: inserted.createdAt,
            },
            latencyMs: Date.now() - started,
        };
    }
}
