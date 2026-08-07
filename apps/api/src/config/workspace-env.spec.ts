import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { workspaceRoot } from './workspace-env';

/**
 * Unit test — no Docker, no database, no network. That is the point of the
 * `unit` Jest project (D9): `npm test` must stay runnable with everything
 * stopped, or people quietly stop running it.
 *
 * Trap #4 in the flesh. `npm run --workspace apps/api` sets cwd to apps/api, so
 * a relative `.env` lookup misses the root file; workspaceRoot() walks up to the
 * `.env.local.template` marker instead of guessing a `../../` depth. The depths
 * that matter differ — src/ under ts-node, dist/ once compiled — so the walk is
 * exercised here from more than one level down.
 */

describe('workspaceRoot', () => {
  let root: string;

  beforeEach(() => {
    // realpath because macOS hands back /var/folders/... for a directory that
    // actually lives at /private/var/folders/..., and dirname() walking
    // preserves whichever spelling it was given.
    root = realpathSync(mkdtempSync(join(tmpdir(), 'workspace-root-')));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('returns the starting directory when it holds the marker', () => {
    writeFileSync(join(root, '.env.local.template'), '');

    expect(workspaceRoot(root)).toBe(root);
  });

  // The two depths are the ones Trap #4 is about: apps/api under ts-node, and
  // apps/api/dist/config once compiled. One test each, because as a single body
  // a regression in only the deep case would be masked by the shallow one.
  it.each([join('apps', 'api'), join('apps', 'api', 'dist', 'config')])(
    'walks up from %s to the directory holding the marker',
    (descendant) => {
      writeFileSync(join(root, '.env.local.template'), '');
      const start = join(root, descendant);
      mkdirSync(start, { recursive: true });

      expect(workspaceRoot(start)).toBe(root);
    },
  );

  it('stops at the nearest marker rather than the outermost one', () => {
    // Guards against a walk that keeps going after a hit — which would resolve
    // a nested workspace to its parent and load the wrong .env.local.
    writeFileSync(join(root, '.env.local.template'), '');

    const inner = join(root, 'inner');
    mkdirSync(inner);
    writeFileSync(join(inner, '.env.local.template'), '');

    expect(workspaceRoot(inner)).toBe(inner);
  });

  it('throws a message naming the starting directory when no marker exists', () => {
    const orphan = join(root, 'orphan');
    mkdirSync(orphan);
    // No marker written anywhere: the walk runs to the filesystem root. It must
    // fail loudly rather than return '/' and let a later step report a
    // confusing missing-file error against a path nobody recognises.

    expect(() => workspaceRoot(orphan)).toThrow(orphan);
  });
});
