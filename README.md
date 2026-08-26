# Juarnal — Field Log

A personal writing site shaped like a stack of field notebooks. React front end,
FastAPI back end, MongoDB for storage.

Public pages: the desk (`/`), a notebook (`/notebook/:slug`), the cork board
(`/wall`), what's being written now (`/now-writing`), and the shelf of years
(`/archive`). The owner's CMS lives at `/studio` behind a password.

## Requirements

- Python 3.9+
- Node 18+ and Yarn — **use Yarn, not npm.** `package.json` relies on the
  `resolutions` field, which npm ignores; installing with npm produces a broken
  `ajv` tree and the dev server fails to start.
- MongoDB 6+ running locally, or a MongoDB Atlas connection string

## Setup

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

python3 -m venv backend/venv
backend/venv/bin/pip install -r backend/requirements.txt

cd frontend && yarn install
```

## Running

Three processes, each in its own terminal.

```bash
mongod --dbpath /path/to/your/data
```

```bash
cd backend && ./venv/bin/uvicorn server:app --port 8001 --reload
```

```bash
cd frontend && yarn start
```

The site is then at http://localhost:3000 and the API at http://localhost:8001/api.

On first boot the backend seeds three notebooks (About me, Writings, Kind Words)
if the `notebooks` collection is empty — see `backend/seed_data.py`. It never
overwrites existing data.

## Configuration

Everything lives in the two `.env` files; see the `.env.example` next to each.

| Variable | Where | Required | Notes |
| --- | --- | --- | --- |
| `MONGO_URL` | backend | yes | Local `mongodb://localhost:27017`, or an Atlas `mongodb+srv://…` string |
| `DB_NAME` | backend | yes | Database name |
| `STUDIO_PASSWORD` | backend | yes | Unlocks `/studio`. The app refuses to start without it — there is deliberately no default, so a forgotten value cannot leave the CMS open. |
| `CORS_ORIGINS` | backend | no | Comma-separated origins allowed to call the API. Defaults to `http://localhost:3000`. Set it to the deployed frontend's origin in production. |
| `RESEND_API_KEY` | backend | no | Without it the app runs; only emailing readers is unavailable. Sending to anyone but your own address needs a domain verified with Resend. |
| `SENDER_EMAIL` | backend | no | From-address for those emails |
| `REACT_APP_BACKEND_URL` | frontend | yes | Backend origin, no trailing slash. Baked in at build time — changing it means rebuilding. |

## Data

All state is in MongoDB — collections `notebooks`, `entries`, `settings`, and
GridFS bucket `music` for the background track. There are no other stores and no
external service is required to run the site.

## Tests

The suite runs against a **live** backend, so start MongoDB and uvicorn first.

```bash
backend/venv/bin/pip install -r backend/requirements-dev.txt
cd backend && ./venv/bin/pytest
```

Expect `17 passed, 3 failed` on a fresh database. The three failures are
assertions written against the author's own live data on the original hosted
deployment, not code faults:

- `TestNowWriting::test_now_writing` expects a specific work-in-progress
  ("Hujan di Simpang Jalan", 40 000 words) that only exists once it is entered in
  Studio.
- `TestSubscribers::test_owner_subscriber_present` expects a specific email
  address to already be subscribed.
- `TestNotify::test_notify_send_once` sends a real email and needs a valid
  `RESEND_API_KEY`.

The other 17 cover notebooks, entries, search, reactions, the guestbook, the
archive and studio auth, and pass against an empty seeded database.


## Deploying

Three free pieces: MongoDB Atlas for data, Cloud Run for the API, Vercel for the
static front end. Put the database and the API in the same region — `Singapore
(asia-southeast1)` on Cloud Run pairs with Atlas's `ap-southeast-1`.

### 1. Database — MongoDB Atlas

Create a free **M0** cluster, add a database user, and allow network access from
anywhere (Cloud Run has no fixed egress IP unless you add a VPC connector). Copy
the `mongodb+srv://…` string; it becomes `MONGO_URL`.

### 2. API — Cloud Run

`backend/Dockerfile` builds the service. From the repo root:

```bash
gcloud run deploy field-log-api --source backend --region asia-southeast1 --allow-unauthenticated
```

Then set `MONGO_URL`, `DB_NAME`, `STUDIO_PASSWORD` and `CORS_ORIGINS` on the
service. The container reads Cloud Run's `PORT`, so nothing else needs changing.

Cloud Run scales to zero, so the first request after an idle spell waits for a
cold start — a few seconds, not the tens of seconds a sleeping VM host takes. If
even that is unwanted, set `--min-instances=1`, which is no longer free.

### 3. Front end — Vercel

Import the repo with **Root Directory** set to `frontend`; `frontend/vercel.json`
supplies the build command, output directory, and the SPA rewrite that keeps
`/wall`, `/archive`, and `/notebook/*` working on a hard refresh.

Set `REACT_APP_BACKEND_URL` to the Cloud Run URL. It is read at build time, not
at runtime, so redeploy after changing it.

### 4. Close the loop

Set `CORS_ORIGINS` on Cloud Run to the Vercel URL. Until you do, the browser
blocks the front end from reaching the API.

## Notes

This project was originally generated on the Emergent platform. It no longer
depends on it: background music is stored in GridFS rather than Emergent's object
storage, and `requirements.txt` now lists only what the code imports (the
original 127-line list from their base image is kept at
`backend/requirements.emergent.txt.bak` for reference). The leftover `.emergent/`
directory is build metadata and is not read by the app.
