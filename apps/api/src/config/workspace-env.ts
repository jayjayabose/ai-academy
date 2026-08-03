import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { config as loadDotenv } from 'dotenv';

/**
 * Trap #4: `npm run --workspace apps/api` sets cwd to apps/api, so a relative
 * `.env` lookup misses the root file. Walk up to the workspace root instead of
 * guessing a `../../` depth — that keeps working from src/ (ts-node) and from
 * dist/ (compiled), which sit at different depths.
 */
export function workspaceRoot(startDir: string = __dirname): string {
    let dir = startDir;

    for (;;) {
        if (existsSync(join(dir, '.env.local.template'))) return dir;

        const parent = dirname(dir);
        if (parent === dir) {
            throw new Error(
                'Could not locate the workspace root (no .env.local.template found walking up ' +
                    `from ${startDir}).`,
            );
        }
        dir = parent;
    }
}

export function envFilePath(): string {
    return join(workspaceRoot(), '.env.local');
}

/** For standalone scripts (the Umzug runner) that boot outside the Nest DI container. */
export function loadEnv(): void {
    const path = envFilePath();

    if (!existsSync(path)) {
        throw new Error(`${path} not found. Run: cp .env.local.template .env.local`);
    }
    loadDotenv({ path, quiet: true });
}
