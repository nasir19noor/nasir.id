# wc2026 — World Cup 2026 wall chart

Live wall chart for the FIFA World Cup 2026: groups & standings, knockout
bracket, top scorers, and full squads for all 48 teams.

| Piece    | Stack     | Port  | Domain                  |
|----------|-----------|-------|-------------------------|
| Frontend | Next.js   | 5002  | https://wc2026.nasir.id |
| Backend  | FastAPI   | 9002  | https://api.wc2026.nasir.id |
| DB       | PostgreSQL | —    | provider-managed        |
| Assets   | S3        | —    | s3://wc2026.nasir.id/   |

## Data sources

- **Wall-chart spreadsheet** (`World_Cup_2026_Wall_Chart.xlsx`, repo root of
  this app) is the **canonical seed**: groups, fixture order, squads,
  captains, and clubs. Loaded into Postgres on first boot — idempotent.
- **ESPN's public soccer scoreboard** (no API key) is the **hourly overlay**:
  scores, kickoff timestamps, live/finished status. The scheduler runs every
  hour in-process via APScheduler. Failure is silent — stale data is better
  than no data.

## Backend layout

```
backend/
├─ main.py                — FastAPI app + lifespan (create tables, seed, scheduler)
├─ database.py            — SQLAlchemy engine/session
├─ models.py              — Team / Player / Fixture / KnockoutMatch
├─ schemas.py             — Pydantic response models
├─ seed_from_excel.py     — Idempotent loader for the wall-chart .xlsx
├─ routers/
│  ├─ groups.py           — /groups, /groups/{letter}
│  ├─ fixtures.py         — /fixtures, /fixtures/today
│  ├─ knockout.py         — /knockout
│  ├─ scorers.py          — /scorers
│  └─ squads.py           — /squads, /squads/{code}
└─ services/
   ├─ espn_fetcher.py     — Pull live scores from ESPN
   ├─ scheduler.py        — Hourly APScheduler job
   └─ standings.py        — Compute Pts/GD/GF from played fixtures
```

## Frontend pages

```
app/
├─ page.tsx               — Dashboard (today + group leaders + top scorers)
├─ groups/page.tsx        — All 12 group tables
├─ groups/[letter]/page.tsx
├─ knockout/page.tsx      — Bracket (R32 → Final)
├─ scorers/page.tsx       — Golden Boot race
├─ squads/page.tsx        — Team picker grouped by group
└─ squads/[teamCode]/page.tsx — Full 26-player squad with positions
```

All pages are server-rendered with `revalidate: 300` (5 min) so the public
site always reflects the hourly DB refresh without hammering the API.

## Operations

| Action                  | Endpoint                          |
|-------------------------|-----------------------------------|
| Health / counts         | `GET  /status`                    |
| Force ESPN refresh now  | `POST /admin/refresh`             |
| Re-run spreadsheet seed | `POST /admin/reseed`              |
| Swagger UI              | `GET  /docs`                      |

## Local dev

```bash
# backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # set DATABASE_URL
uvicorn main:app --reload --host 0.0.0.0 --port 9002

# frontend
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:9002 npm run dev
```

## Deploy

The GitHub workflow at `.github/workflows/apps-wc2026.yml` deploys backend and
frontend independently on push (paths-filter). Backend pulls `.env` from
`s3://wc2026.nasir.id/backend/.env` before building.
