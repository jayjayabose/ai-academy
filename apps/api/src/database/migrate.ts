import { join } from 'node:path';
import { QueryInterface, Sequelize } from 'sequelize';
import { MigrationFn, SequelizeStorage, Umzug } from 'umzug';
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
 *
 * Everything is behind `createMigrator()` rather than module scope so that the
 * integration suite's globalSetup can import and drive it (D8: crm_test's
 * schema is built by these migrations). At module scope, merely importing this
 * file would run the CLI against crm_dev as a side effect.
 */

export type MigrationTarget = 'dev' | 'test';

/** The signature every migration file's `up` and `down` must match. */
export type Migration = MigrationFn<QueryInterface>;

export interface Migrator {
    umzug: Umzug<QueryInterface>;
    sequelize: Sequelize;
    /** The resolved database name, for log lines that need to name the target. */
    database: string;
}

export function createMigrator(target: MigrationTarget): Migrator {
    loadEnv();

    const variable = target === 'test' ? 'DB_TEST_NAME' : 'DB_NAME';
    const database = process.env[variable];

    // Without this, an unset variable reaches Sequelize as `undefined`, which
    // libpq resolves to a database named after the connecting user — so the
    // migration would apply somewhere unintended and still report success.
    if (!database) {
        throw new Error(`${variable} is not set in .env.local; cannot migrate the "${target}" database.`);
    }

    const sequelize = new Sequelize({
        dialect: 'postgres',
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database,
        logging: false,
        // Deliberately NO `define: { underscored: true }` here. It has no effect on
        // QueryInterface calls (Trap #5 — migrations spell columns by hand), and it
        // silently renames Umzug's own bookkeeping table.
    });

    const umzug = new Umzug({
        migrations: { glob: join(__dirname, 'migrations/*.ts') },
        context: sequelize.getQueryInterface(),
        // Pinned explicitly. Left to default, the table name would depend on the
        // Sequelize `define` options above: dropping `underscored` would flip it
        // from sequelize_meta to SequelizeMeta, Umzug would find no history, and
        // every migration would re-run.
        storage: new SequelizeStorage({ sequelize, tableName: 'sequelize_meta' }),
        logger: undefined,
    });

    return { umzug, sequelize, database };
}

async function main(): Promise<void> {
    const command = process.argv[2] ?? 'up';
    const { umzug, sequelize, database } = createMigrator(process.env.MIGRATE_TARGET === 'test' ? 'test' : 'dev');

    try {
        switch (command) {
            case 'up': {
                const applied = await umzug.up();
                console.log(
                    applied.length
                        ? `✓ applied ${applied.length} migration(s) to ${database}: ${applied.map((m) => m.name).join(', ')}`
                        : `✓ ${database} already up to date`,
                );
                break;
            }

            case 'down': {
                const reverted = await umzug.down();
                console.log(
                    reverted.length
                        ? `✓ reverted ${reverted.map((m) => m.name).join(', ')} on ${database}`
                        : `✓ nothing to revert on ${database}`,
                );
                break;
            }

            case 'status': {
                const [executed, pending] = await Promise.all([umzug.executed(), umzug.pending()]);
                console.log(`${database}: ${executed.length} migrations up, ${pending.length} pending`);
                for (const m of executed) console.log(`  up      ${m.name}`);
                for (const m of pending) console.log(`  pending ${m.name}`);
                break;
            }

            default:
                throw new Error(`Unknown command "${command}". Expected: up | down | status`);
        }
    } finally {
        await sequelize.close();
    }
}

// Guarded: importing this module must not run the CLI. globalSetup depends on
// that, and so does every migration file — they import the `Migration` type
// from here.
if (require.main === module) {
    main().catch((error: unknown) => {
        console.error(`\n✗ migration failed:`, error instanceof Error ? error.message : error);
        process.exitCode = 1;
    });
}
