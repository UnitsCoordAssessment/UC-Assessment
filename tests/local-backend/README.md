# Local backend tests

These tests run the assessment against a local stand-in for Supabase, so the
database rules and the saving code can be checked without touching a real
project.

Supabase is PostgreSQL with PostgREST in front of it. These tests use the same
two programs:

| File | Purpose |
|---|---|
| `supabase_roles.sql` | Creates the roles and default permissions every Supabase project has (`anon`, `authenticated`, `service_role`). Only for local testing; never run on Supabase. |
| `access_rules_test.sql` | 28 checks of what each role can and cannot do |
| `make_keys.py` | Makes local versions of the anon and service_role keys |
| `proxy.js` | Forwards `/rest/v1/...` to PostgREST, as Supabase's gateway does |
| `e2e_test.py` | Drives a real browser through seven scenarios and checks the database afterwards (40 checks) |
| `run_all.sh` | Runs everything |

## Requirements

- Node.js 18 or later
- PostgreSQL 13 or later, running, with a superuser login
- PostgREST (one executable file from the PostgREST releases page on GitHub)
- Python 3 with Playwright: `pip install playwright && playwright install chromium`

## Run

```bash
PG_ADMIN_URL=postgresql://postgres@localhost:5432/postgres \
POSTGREST_BIN=/path/to/postgrest \
tests/local-backend/run_all.sh
```

The script creates and replaces a database named `uca_test`, and uses ports
3901–3903.
