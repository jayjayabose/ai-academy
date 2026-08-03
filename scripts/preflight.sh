#!/usr/bin/env bash
# Fail fast with a readable message instead of a cryptic connection timeout
# three minutes later. Run by `npm run setup`.
set -euo pipefail

fail() {
	printf '\n\033[31m✗ %s\033[0m\n\n' "$1" >&2
	exit 1
}

# --- .env.local ---------------------------------------------------------------
if [[ ! -f .env.local ]]; then
	fail ".env.local not found.
  Run:  cp .env.local.template .env.local"
fi

# --- Node ---------------------------------------------------------------------
required_major=22
actual_major="$(node -p 'process.versions.node.split(".")[0]')"
if ((actual_major < required_major)); then
	fail "Node ${required_major}+ required, found $(node -v).
  NestJS 11 needs >=20 and Angular needs ^22.22.3.
  Run:  nvm use          (this repo pins 22 in .nvmrc)"
fi

# --- Docker -------------------------------------------------------------------
command -v docker >/dev/null 2>&1 || fail "docker not found on PATH."

if ! docker info >/dev/null 2>&1; then
	fail "Docker daemon is not running.
  Start Docker Desktop, then re-run:  npm run setup"
fi

# --- Host port ----------------------------------------------------------------
# shellcheck disable=SC1091
set -a && source .env.local && set +a

if lsof -nP -iTCP:"${DB_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
	if ! docker compose --env-file .env.local ps --status running 2>/dev/null | grep -q postgres; then
		fail "Port ${DB_PORT} is already in use by a non-Compose process.
  Inspect with:  lsof -nP -iTCP:${DB_PORT} -sTCP:LISTEN
  Either stop it, or change DB_PORT in .env.local."
	fi
fi

printf '\033[32m✓ preflight ok\033[0m  (node %s, docker up, port %s available)\n' "$(node -v)" "${DB_PORT}"
