// `npm start` for apps/web: ng serve on WEB_PORT from the workspace-root .env.local
// (default 4300), so parallel worktrees do not fight over one port.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const { readDevEnv } = createRequire(import.meta.url)('../dev-env.cjs');
const { webPort } = readDevEnv();

const child = spawn('ng', ['serve', '--port', webPort, ...process.argv.slice(2)], {
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.on('exit', (code) => process.exit(code ?? 0));
