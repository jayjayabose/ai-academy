#!/usr/bin/env bash
# Open psql against the Compose database without remembering the non-default port.
#   npm run db:psql              -> dev database
#   npm run db:psql -- test      -> test database
set -euo pipefail

# shellcheck disable=SC1091
set -a && source .env.local && set +a

target="${1:-dev}"
case "$target" in
dev) db="$DB_NAME" ;;
test) db="$DB_TEST_NAME" ;;
*) db="$target" ;;
esac

exec docker compose --env-file .env.local exec -e PGPASSWORD="$DB_PASSWORD" \
	postgres psql -U "$DB_USER" -d "$db"
