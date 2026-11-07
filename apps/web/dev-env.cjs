// Reads ONLY the dev-server settings from the workspace-root .env.local.
//
// `.env.local` is the single source of truth for ports (the API reads PORT from it
// too), but `ng serve` never loads it. parseEnv returns an object instead of mutating
// process.env, so the secrets in that file (API keys) never reach the dev server.
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const { parseEnv } = require('node:util');

function readDevEnv() {
  const file = join(__dirname, '..', '..', '.env.local');
  const env = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
  return {
    apiPort: process.env.PORT || env.PORT || '4000',
    webPort: process.env.WEB_PORT || env.WEB_PORT || '4300',
  };
}

module.exports = { readDevEnv };
