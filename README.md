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

| Variable | Where | Notes |
| --- | --- | --- |
| `MONGO_URL` | backend | Local `mongodb://localhost:27017`, or an Atlas `mongodb+srv://…` string |
| `DB_NAME` | backend | Database name |
| `STUDIO_PASSWORD` | backend | Unlocks `/studio`. Change it before deploying. |
| `RESEND_API_KEY` | backend | Optional. Without it the app runs; only emailing readers is unavailable. |
| `REACT_APP_BACKEND_URL` | frontend | Backend origin, no trailing slash |

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

## Notes

This project was originally generated on the Emergent platform. It no longer
depends on it: background music is stored in GridFS rather than Emergent's object
storage, and `requirements.txt` now lists only what the code imports (the
original 127-line list from their base image is kept at
`backend/requirements.emergent.txt.bak` for reference). The leftover `.emergent/`
directory is build metadata and is not read by the app.
