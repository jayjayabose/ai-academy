import { NestFactory } from '@nestjs/core';
import { SeedModule } from './seed.module';
import { SeedService } from './seed.service';

/**
 * CSV import entrypoint.
 *
 *   ts-node src/database/seed/seed.ts            # additive  (npm run db:seed)
 *   ts-node src/database/seed/seed.ts --fresh    # truncates (npm run db:seed:fresh)
 *
 * The two are separate commands and must stay that way. `npm run setup` calls
 * db:seed, so a truncating seed would make the safe-sounding run-me-first
 * command silently destroy data. No ecosystem does this — Rails has a separate
 * db:seed:replant, Laravel migrate:fresh --seed, Prisma migrate reset; `seed`
 * itself is additive everywhere.
 */
async function main(): Promise<void> {
  const fresh = process.argv.includes('--fresh');

  const app = await NestFactory.createApplicationContext(SeedModule, {
    // The banner and route logs are noise for a one-shot script; real problems
    // still surface.
    logger: ['error', 'warn'],
  });

  try {
    const result = await app.get(SeedService).seed({ fresh });

    if (result.outcome === 'skipped') {
      // Exit 0, not 1. `npm run setup` calls this, and setup must stay
      // re-runnable — a non-zero exit here would break clone-and-run for anyone
      // who runs it twice.
      console.log(
        `✓ leads already contains ${result.existingLeads} row(s); nothing seeded.\n` +
          `  To replace the existing data, run: npm run db:seed:fresh`,
      );
      return;
    }

    console.log(
      `✓ seeded ${result.leads} leads and ${result.interactions} interactions` +
        (result.truncated ? ' (existing data was replaced)' : ''),
    );
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(
      `\n✗ seed failed:`,
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  });
}
