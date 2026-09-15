# Field Log

A personal writing site with a React reader, a FastAPI Studio API, and Supabase
PostgreSQL + Storage. Vercel serves both the frontend and API from one domain.

## Deploy and migrate

Follow [the Supabase migration guide](docs/SUPABASE-MIGRATION.md).

- Run `supabase/migrations/001_field_log.sql` in your Supabase project.
- Configure the server-only Supabase key and Studio password in Vercel.
- Set Vercel Root Directory to the repository root, Framework Preset to Other.
- Import existing content explicitly, preserving IDs, and re-upload music.

The application no longer requires MongoDB or Google Cloud. Changing the code
alone does not migrate the production database. New databases start empty;
sample fiction is never automatically inserted into production.

## Local development

Requires Python 3.12, Node and Yarn 1.22.22. Use Yarn for the frontend because
its dependency resolutions are part of the existing setup.

1. Copy `backend/.env.example` to `backend/.env` and configure Supabase and Studio.
2. Install `backend/requirements.txt` in a Python virtual environment.
3. Run `uvicorn server:app --port 8001 --reload` from `backend`.
4. Copy `frontend/.env.example` to `frontend/.env`.
5. Run `yarn install` and `yarn start` from `frontend`.

## Verification

From the repository root, in the configured Python environment:

```sh
python -m unittest backend.tests.test_supabase_migration -v
```

This runs real API routes with mock Supabase HTTP responses and sends no email.
SQL integration checks use an isolated PostgreSQL WASM instance:

```sh
npm install --prefix .qa --no-save --package-lock=false @electric-sql/pglite@0.3.14
node backend/tests/check_sql.mjs
```

Build the frontend with `yarn --cwd frontend build`.

The older `backend/tests/backend_test.py` suite targets a live database and
includes owner-data assumptions and real email sending. Do not run it against
production as a generic smoke test.
