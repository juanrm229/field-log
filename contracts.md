# API Contracts — Juan Maulana / Koda Field Log

## Data Models (MongoDB, UUID ids)

### Notebook
```
{ id, slug, label, cover_title ("FIELD LOG"), subtitle: [str, str],
  variant: "orange"|"paper"|"blue"|"forest"|"night", order: int, created_at }
```

### Entry (generic page content inside a notebook)
```
{ id, notebook_id, type: "piece"|"about"|"kind",
  category (Novel/Short Story/Poetry/Journal/...), title, date, meta, body,
  chapters: [{title, body}] (optional, for novels),
  // for type "about": sub -> stored in meta, heading -> title
  // for type "kind": quote -> body, name -> title, role -> meta
  order: int, created_at }
```

## Endpoints (all prefixed /api)
- `GET  /api/notebooks` — list all notebooks ordered by `order`
- `POST /api/notebooks` — create (slug auto from label if absent)
- `PUT  /api/notebooks/{id}` — update cover fields
- `DELETE /api/notebooks/{id}` — delete notebook + its entries
- `GET  /api/notebooks/{slug}/full` — notebook + entries (ordered)
- `POST /api/entries` — create entry
- `PUT  /api/entries/{id}` — update entry
- `DELETE /api/entries/{id}`

## Seeding
On startup: if `notebooks` collection empty → seed the 3 default notebooks
(about / writings / kind-words) with the current mock content from mock.js.

## Mocked data being replaced
`/app/frontend/src/mock.js` (NOTEBOOKS, WRITINGS, ABOUT_PAGES, KIND_WORDS)
→ replaced by API calls. mock.js kept only for seed reference in backend.

## Frontend integration
- `src/api.js` — axios wrapper using REACT_APP_BACKEND_URL + /api
- HomePage: GET /notebooks → dynamic fan layout (supports N notebooks)
- NotebookView: GET /notebooks/{slug}/full → build pages (cover, toc if pieces,
  entry pages). Piece pages get "Read" button → immersive Reader overlay
  (fullscreen, chapters nav, font-size controls, progress bar, light/dark paper).
- New route `/studio` — CMS: manage notebooks (cover live preview) and entries
  (form incl. chapters editor). No auth (private-by-URL for MVP).
