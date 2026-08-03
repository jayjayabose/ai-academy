#!/bin/bash
# Creates the test database alongside the dev database (Decision 8: one
# container, two databases). Runs only on first initialisation of the volume.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	CREATE DATABASE "${DB_TEST_NAME}";
	GRANT ALL PRIVILEGES ON DATABASE "${DB_TEST_NAME}" TO "${POSTGRES_USER}";
EOSQL

echo "initdb: created database ${DB_TEST_NAME}"
