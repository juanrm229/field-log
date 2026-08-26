# Field Log — PRD

## Problem Statement
Situs pribadi "Field Log" bergaya buku catatan Field Notes: notebook interaktif berisi tulisan (cerita, puisi, jurnal), halaman About, dan Kind Words. Bahasa user: Indonesia.

## Arsitektur
- Backend: FastAPI (`/app/backend/server.py`), MongoDB via motor, auto-seed dari `seed_data.py` saat DB kosong.
- Frontend: React + Tailwind (`/app/frontend/src`), animasi flip buku 3D.
- Studio (admin) tersembunyi di `/studio`, password: `koda3am` (env `STUDIO_PASSWORD`).

## Environment (dibuat ulang 26 Jun 2026 — permintaan user: "pakai db baru dan environmentnya ubah")
- `/app/backend/.env`: MONGO_URL=mongodb://localhost:27017, **DB_NAME=field_log_fresh** (DB baru), STUDIO_PASSWORD=koda3am
- `/app/frontend/.env`: REACT_APP_BACKEND_URL=https://a45d4612-bebb-41cb-a40c-8705eb1230f3.preview.emergentagent.com

## Fitur Selesai (dari sesi sebelumnya, backend 72/72 tes lulus)
- Notebooks + entries CRUD (studio-key protected), 9 varian cover
- Search lintas notebook, draft status, reactions pembaca (heart/sparkles/feather/coffee)
- Ideas (saran cerita), Guestbook "The Wall" dengan moderasi, Now Writing progress singleton
- Bookmark pita, quote card, suara kertas, kursor pena, drag-to-flip

## Sesi ini (26 Jun 2026)
- Membuat ulang .env backend & frontend, DB baru `field_log_fresh` (auto-seed 3 notebook: about, writings, kind-words)
- Verifikasi: API `/api/notebooks` OK, homepage tampil normal

## Backlog
- P1: Reader email list (notifikasi tulisan baru)
- P1: Yearly shelf / arsip per tahun
- P2: Ambient sound di reader, reading stats per entry

## API Utama
- GET /api/notebooks, GET /api/notebooks/{slug}/full, GET /api/search?q=
- POST/PUT/DELETE /api/notebooks, /api/entries (header X-Studio-Key)
- POST /api/studio/auth, /api/ideas, /api/guestbook, /api/entries/{id}/react
- GET/PUT /api/now-writing
