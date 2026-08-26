# Field Log — PRD

## Problem Statement
Situs pribadi "Field Log" bergaya buku catatan Field Notes: notebook interaktif berisi tulisan (cerita, puisi, jurnal), halaman About, dan Kind Words. Bahasa user: Indonesia.

## Arsitektur
- Backend: FastAPI (`/app/backend/server.py`), MongoDB via motor, auto-seed dari `seed_data.py` saat DB kosong.
- Frontend: React + Tailwind (`/app/frontend/src`), animasi flip buku 3D.
- Studio (admin) tersembunyi di `/studio`, password: `koda3am` (env `STUDIO_PASSWORD`).
- Integrasi: Resend (email notifikasi, RESEND_API_KEY), Emergent Object Storage (musik latar, EMERGENT_LLM_KEY + INTEGRATION_PROXY_URL).

## Environment
- `/app/backend/.env`: MONGO_URL, DB_NAME=field_log_fresh, STUDIO_PASSWORD, RESEND_API_KEY, SENDER_EMAIL=onboarding@resend.dev, EMERGENT_LLM_KEY
- `/app/frontend/.env`: REACT_APP_BACKEND_URL

## Fitur Selesai
### Sesi lama (backend 72/72 tes lulus)
- Notebooks + entries CRUD (studio-key), 9 varian cover, search, draft, reactions, ideas, guestbook wall (moderasi), Now Writing singleton, bookmark pita, quote card, suara kertas, kursor pena, drag-to-flip.

### 26 Jun 2026 (sesi ini)
- .env dibuat ulang, DB baru `field_log_fresh` (auto-seed 3 notebook)
- **Now Writing diaktifkan**: "Hujan di Simpang Jalan", 12.480/40.000 kata
- **Daftar email pembaca**: POST/GET/DELETE `/api/subscribers`, kartu langganan (SubscribeCard) di Wall & Now Writing; panel Studio + kirim surat massal via Resend `POST /api/notify` (TERUJI: email sungguhan terkirim ke witnessday29@gmail.com). Catatan: mode testing Resend hanya kirim ke email terverifikasi sampai domain diverifikasi.
- **Arsip tahunan** `/archive`: `GET /api/archive` (grup per tahun dari field date), rak kayu + punggung buku bisa ditarik, panel isi tahun dengan link deep-link.
- **Statistik baca**: kata + menit di TOC notebook (sudah ada di halaman piece).
- **Wall dirombak**: papan gabus berbingkai kayu, pushpin/washi, kertas bergaris, animasi jatuh + goyang saat hover, label judul ditempel, kartu Field Mail terpasang di papan.
- **Homepage desk dirombak** (feedback user: props lama tidak menyatu): desk pad kertas menjangkar tumpukan, anotasi tinta satu nada (judul + panah, catatan margin, stempel FIELD LOG, "pick one to open").
- **Dark mode Wall & Archive**: cork/frame/plank/spine punya varian dark.
- **Musik latar**: upload via Studio (mp3/m4a/ogg max 20MB) → Emergent Object Storage; `GET /api/music`, `GET /api/music/stream` (cache in-memory), `DELETE /api/music`; MusicPlayer global autoplay (fallback tap pertama) + toggle mute pill kiri-bawah (localStorage). TERUJI end-to-end via curl (upload→stream 200 audio/wav); file tes sudah dihapus — user tinggal upload lagu asli via Studio.
- **Deployment health check: PASS** (deployment_agent, 26 Jun 2026) — siap deploy.

## Belum diverifikasi penuh
- Testing agent BELUM dijalankan untuk fitur frontend sesi ini (user pause 2x). Backend diverifikasi via curl; frontend via screenshot (light+dark).

## Backlog
- P1: Jalankan testing agent penuh (frontend flows: subscribe, wall, archive, studio panels, music toggle)
- P2: Verifikasi domain di Resend agar surat sampai ke semua subscriber
- P2: Ambient sound reader, drag urutan entri

## API Utama
- GET /api/notebooks, /api/notebooks/{slug}/full, /api/search, /api/archive, /api/music, /api/music/stream
- POST /api/subscribers (publik), /api/notify (key), /api/music (key, multipart), /api/guestbook, /api/ideas, /api/entries/{id}/react
- CRUD notebooks/entries + guestbook moderasi + now-writing (key: X-Studio-Key)
