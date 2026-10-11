#!/usr/bin/env bash
# Runs every test against a throwaway local copy of the backend:
#   1. answer-parser unit tests (Node)
#   2. database access rules (PostgreSQL)
#   3. end-to-end browser tests (Chromium + supabase-js + PostgREST + PostgreSQL)
#
# Needs: node, psql + a running PostgreSQL you can connect to as a superuser,
# the PostgREST binary, and Python with Playwright (pip install playwright &&
# playwright install chromium). See README.md in this folder.
#
# Usage:
#   PG_ADMIN_URL=postgresql://postgres@localhost:5432/postgres \
#   POSTGREST_BIN=/path/to/postgrest \
#   tests/local-backend/run_all.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HERE="$ROOT/tests/local-backend"
PG_ADMIN_URL="${PG_ADMIN_URL:?Set PG_ADMIN_URL to a superuser connection string}"
POSTGREST_BIN="${POSTGREST_BIN:?Set POSTGREST_BIN to the PostgREST executable}"
DB=uca_test
DB_URL="${PG_ADMIN_URL%/*}/$DB"
WORK="$(mktemp -d)"
SECRET="local-test-secret-that-is-at-least-32-characters-long"
PIDS=()
cleanup() { for p in "${PIDS[@]:-}"; do kill "$p" 2>/dev/null || true; done; rm -rf "$WORK"; }
trap cleanup EXIT

fresh_db() {
  psql "$PG_ADMIN_URL" -q -c "drop database if exists $DB with (force);" -c "create database $DB;"
  psql "$DB_URL" -q -v ON_ERROR_STOP=1 -f "$HERE/supabase_roles.sql" 2>/dev/null
  psql "$DB_URL" -q -v ON_ERROR_STOP=1 -f "$ROOT/supabase/schema.sql" 2>&1 | grep -v NOTICE || true
}

echo "== 1. Answer parser, answer-box filter and answer coder"
node --test "$ROOT/tests/answer-parser.test.js" "$ROOT/tests/answer-filter.test.js" "$ROOT/tests/answer-coder.test.js"

echo "== 2. Access rules"
fresh_db
psql "$DB_URL" -q -v ON_ERROR_STOP=1 -f "$HERE/access_rules_test.sql" 2>&1 \
  | grep -E "ok |FAIL|PASSED" | sed 's/^psql:[^ ]* //; s/^NOTICE:  //'

echo "== 3. End to end"
fresh_db
python3 "$HERE/make_keys.py" "$SECRET" > "$WORK/keys.json"
ANON="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['anon'])" "$WORK/keys.json")"
PG_HOSTPART="${DB_URL#*@}"
cat > "$WORK/postgrest.conf" <<EOF
db-uri = "postgres://authenticator:authenticator@$PG_HOSTPART"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$SECRET"
server-port = 3901
EOF
"$POSTGREST_BIN" "$WORK/postgrest.conf" > "$WORK/postgrest.log" 2>&1 & PIDS+=($!)
node "$HERE/proxy.js" 3902 3901 > "$WORK/proxy.log" 2>&1 & PIDS+=($!)
(cd "$ROOT" && python3 -m http.server 3903 --bind 127.0.0.1 > "$WORK/http.log" 2>&1) & PIDS+=($!)
sleep 3
python3 "$HERE/e2e_test.py" "http://localhost:3903/index.html" "http://localhost:3902" "$ANON" "$DB_URL"
