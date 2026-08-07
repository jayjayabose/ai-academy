import { createMigrator } from '../src/database/migrate';
import { describeError } from './helpers/describe-error';

/**
 * Runs ONCE for the `integration` project, before any test file is loaded.
 *
 * Decision 8: crm_test's schema is built by the migrations — the same ones that
 * build crm_dev — rather than by `synchronize: true`. Chapter 02:633-642
 * specifies synchronize; we deviate deliberately. A synchronize-built schema
 * never exercises the migrations, so a broken migration would pass the entire
 * suite and fail only on a fresh clone.
 *
 * This also retires a standing hazard: crm_dev and crm_test keep independent
 * sequelize_meta ledgers, and `npm run db:migrate` touches only crm_dev. Before
 * this file existed the test database was kept current by hand.
 */
export default async function globalSetup(): Promise<void> {
    const { umzug, sequelize, database } = createMigrator('test');

    try {
        const applied = await umzug.up();

        console.log(
            applied.length
                ? `\n  migrated ${database}: applied ${applied.map((m) => m.name).join(', ')}`
                : `\n  migrated ${database}: already up to date`,
        );
    } catch (error) {
        // The overwhelmingly likely cause is a stopped container, and Sequelize's
        // own ECONNREFUSED does not mention Docker. Name the fix in the message.
        throw new Error(
            `Could not migrate ${database}. Is Postgres running? Start it with: npm run db:up\n` +
                `Cause: ${describeError(error)}`,
            { cause: error },
        );
    } finally {
        await sequelize.close();
    }
}
