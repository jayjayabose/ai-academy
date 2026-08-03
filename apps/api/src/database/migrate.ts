import { join } from 'node:path';
import { Sequelize } from 'sequelize';
import { SequelizeStorage, Umzug } from 'umzug';
import { loadEnv } from '../config/workspace-env';

/**
 * Decision 3: Umzug owns the schema; `synchronize` is off everywhere.
 *
 * This runner deliberately shares .env.local with the Nest app rather than
 * keeping its own config file — that single source of truth is the reason
 * Umzug was chosen over sequelize-cli.
 *
 * Usage:
 *   ts-node src/database/migrate.ts up|down|status
 *   MIGRATE_TARGET=test ts-node src/database/migrate.ts up
 */
loadEnv();

const target = process.env.MIGRATE_TARGET === 'test' ? process.env.DB_TEST_NAME : process.env.DB_NAME;

const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: target,
    logging: false,
    // Deliberately NO `define: { underscored: true }` here. It has no effect on
    // QueryInterface calls (Trap #5 — migrations spell columns by hand), and it
    // silently renames Umzug's own bookkeeping table.
});

export const umzug = new Umzug({
    migrations: { glob: join(__dirname, 'migrations/*.ts') },
    context: sequelize.getQueryInterface(),
    // Pinned explicitly. Left to default, the table name would depend on the
    // Sequelize `define` options above: dropping `underscored` would flip it
    // from sequelize_meta to SequelizeMeta, Umzug would find no history, and
    // every migration would re-run.
    storage: new SequelizeStorage({ sequelize, tableName: 'sequelize_meta' }),
    logger: undefined,
});

export type Migration = typeof umzug._types.migration;

async function main(): Promise<void> {
    const command = process.argv[2] ?? 'up';

    switch (command) {
        case 'up': {
            const applied = await umzug.up();
            console.log(
                applied.length
                    ? `✓ applied ${applied.length} migration(s) to ${target}: ${applied.map((m) => m.name).join(', ')}`
                    : `✓ ${target} already up to date`,
            );
            break;
        }

        case 'down': {
            const reverted = await umzug.down();
            console.log(
                reverted.length
                    ? `✓ reverted ${reverted.map((m) => m.name).join(', ')} on ${target}`
                    : `✓ nothing to revert on ${target}`,
            );
            break;
        }

        case 'status': {
            const [executed, pending] = await Promise.all([umzug.executed(), umzug.pending()]);
            console.log(`${target}: ${executed.length} migrations up, ${pending.length} pending`);
            for (const m of executed) console.log(`  up      ${m.name}`);
            for (const m of pending) console.log(`  pending ${m.name}`);
            break;
        }

        default:
            throw new Error(`Unknown command "${command}". Expected: up | down | status`);
    }
}

main()
    .catch((error: unknown) => {
        console.error(`\n✗ migration failed:`, error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => sequelize.close());
