# Field Log: Vercel + Supabase

## What is ready in the repository

The existing FastAPI API now stores its document-shaped data as PostgreSQL
JSONB rows through the Supabase Data API. All Studio CRUD routes continue to
use the same URLs. No MongoDB process, MongoDB driver or Google Cloud runtime
is required. Queries are evaluated server-side after paginated collection
reads; this preserves the small publication's existing search semantics. This
adapter is not designed for very large collections; indexes and SQL queries
should replace these scans as the publication grows.

Music uses a private Supabase Storage bucket. An authenticated Studio request
creates a signed upload URL, the browser uploads directly, and the API checks
the object size before changing the active track. Playback redirects to a
temporary download URL, allowing Storage to handle audio range requests.
Incomplete uploads do not replace the current music. Abandoned uploads remain
in Storage and can be removed after confirming they are not the active track.

## 1. Prepare the supplied Supabase project

Project URL: https://oiejqcraydurnfhwvayq.supabase.co

Open SQL Editor, paste `supabase/migrations/001_field_log.sql`, and run it.
It creates only `field_log_records`, one server-only mutation function and
the private `field-log-music` bucket. No sample stories are inserted.
Anonymous and authenticated browser roles cannot read or write the records;
only the API's server key can access them.

## 2. Vercel project settings

Change Root Directory from `frontend` to the **repository root** (empty field).
Use Framework Preset **Other**. The root `vercel.json` specifies the install,
build and output settings. It deploys the frontend, Python API, sitemap,
preview images and preview middleware together.

Add these server environment variables to the intended deployment environment:

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | `https://oiejqcraydurnfhwvayq.supabase.co` |
| `SUPABASE_SECRET_KEY` | Supabase server secret key, or use `SUPABASE_SERVICE_ROLE_KEY` for a legacy service-role key |
| `STUDIO_PASSWORD` | A new password chosen by the owner |
| `RESEND_API_KEY` | Optional, needed only to email subscribers |
| `SENDER_EMAIL` | Optional, verified Resend sender |

Do not prefix secrets with `REACT_APP_` and do not commit them. Remove the old
`REACT_APP_BACKEND_URL` setting. Production calls its own `/api` regardless of
that old setting. Do not enable `SEED_SAMPLE_DATA` in production.

## 3. Existing content

Changing the backend does not move the old database's contents. Export the
production data before replacing anything. The local demonstration database
is not evidence of the owner's production content. Keep the old database and
Cloud Run service until the owner verifies the new deployment and migration.

For JSON exports, prepare `{ "notebooks": [...], "entries": [...], ... }`
with the original `id`, `_id` singleton values and cross-reference IDs intact.
Use `backend/import_records.py --file PATH --apply` with Supabase environment
variables set locally. Run without `--apply` first for a collection summary.
The importer refuses existing keys and imports no audio bytes; re-upload the
original music file from Studio. Do not import old `gridfs_id` music metadata.
Do not put private exports in Git.

## 4. Verify after deployment

1. `/api/` returns JSON, and `/api/notebooks` returns an array.
2. Studio accepts the configured password; a wrong password returns 401.
3. Create a notebook and a draft, edit and publish it, then verify the public
   page. Drafts must not appear through search or a direct read URL.
4. Upload a music file, reload, play/seek, replace and delete it.
5. Verify The Crossing and existing IDs, guestbook moderation and subscriptions.
6. Confirm anonymous Supabase requests cannot read private records.

Local API tests use mocked Supabase HTTP responses. The SQL migration, atomic
updates and role permissions are also tested with an isolated PostgreSQL WASM
instance. Credentials, the real project's RLS and Storage CORS, and Vercel
routing must still be verified against the live deployment.

Imports are not one transaction across all collections. If an upstream request
fails partway through, inspect inserted rows before preparing a remaining-records
export. The importer never overwrites or deletes existing records.

## Local development

Copy `backend/.env.supabase.example` to `backend/.env` and fill the server keys.
Install `backend/requirements.txt`, then run `uvicorn server:app --port 8001`
from `backend`. Keep `REACT_APP_BACKEND_URL=http://localhost:8001` in the local
frontend `.env`, and run `yarn start` from `frontend`.
