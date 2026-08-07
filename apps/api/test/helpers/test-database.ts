import { Sequelize } from 'sequelize-typescript';
import { loadEnv } from '../../src/config/workspace-env';
import { Interaction } from '../../src/interactions/interaction.model';
import { Lead } from '../../src/leads/lead.model';
import { describeError } from './describe-error';

/**
 * Connection management for integration tests, imported as `@test/helpers`
 * (chapter 02:623).
 *
 * The schema is NOT created here — test/global-setup.ts runs the migrations
 * once before any test file loads (D8). These helpers only connect and empty.
 *
 * One connection is shared across a file's tests; `test:integration` runs
 * `--runInBand` so parallel workers cannot truncate each other's rows.
 */

let connection: Sequelize | undefined;

/**
 * Connects to crm_test and empties it. Safe to call from several `beforeAll`
 * hooks — the connection is reused, but the tables are cleared each time, so a
 * suite always starts from a known-empty database.
 */
export async function setupTestDatabase(): Promise<Sequelize> {
  if (!connection) {
    connection = await connect();
  }

  await truncateAll();

  return connection;
}

/** The live connection. Throws rather than returning undefined, so a test that forgets `setupTestDatabase()` fails with a sentence instead of a TypeError. */
export function testConnection(): Sequelize {
  if (!connection) {
    throw new Error(
      'No test database connection. Call setupTestDatabase() in beforeAll first.',
    );
  }

  return connection;
}

/** Empties every table. CASCADE so a future table with an FK to leads does not need this helper edited before it works. */
export async function truncateAll(): Promise<void> {
  await testConnection().query('TRUNCATE TABLE leads, interactions CASCADE');
}

export async function teardownTestDatabase(): Promise<void> {
  if (!connection) return;

  await connection.close();
  connection = undefined;
}

async function connect(): Promise<Sequelize> {
  loadEnv();

  const database = process.env.DB_TEST_NAME;

  if (!database) {
    throw new Error(
      'DB_TEST_NAME is not set in .env.local; refusing to guess which database to truncate.',
    );
  }

  // These helpers TRUNCATE. The one mistake that must never be survivable is
  // pointing them at the development database.
  if (database === process.env.DB_NAME) {
    throw new Error(
      `DB_TEST_NAME and DB_NAME are both "${database}". Refusing to run: the test helpers truncate every table.`,
    );
  }

  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database,

    models: [Lead, Interaction],

    // Decision 4: set globally so no individual model can forget it. Must match
    // database.module.ts, or the models look for camelCase columns that the
    // migration never created.
    define: { underscored: true },

    logging: false,

    // No sync() call anywhere in this file, deliberately. sequelize-typescript
    // never touches the schema unless asked; the migrations own it.
  });

  try {
    await sequelize.authenticate();
  } catch (error) {
    await sequelize.close();
    throw new Error(
      `Could not connect to ${database} on ${process.env.DB_HOST}:${process.env.DB_PORT}. ` +
        `Is Postgres running? Start it with: npm run db:up\n` +
        `Cause: ${describeError(error)}`,
      { cause: error },
    );
  }

  return sequelize;
}
