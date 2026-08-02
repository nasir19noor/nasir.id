# ucl — UEFA Champions League 2026/27 wall chart

Live wall chart for the UCL 2026/27 season: the 36-club league-phase table,
fixtures by matchday, two-legged knockout ties, and the top-scorer race.

| Piece    | Stack      | Port | Domain                   |
|----------|------------|------|--------------------------|
| Frontend | Next.js    | 5004 | https://ucl.nasir.id     |
| Backend  | FastAPI    | 9004 | https://api.ucl.nasir.id |
| DB       | PostgreSQL | —    | `ucl` on the Contabo box |
| Assets   | S3         | —    | s3://ucl.nasir.id/       |

## Data source

**ESPN's public soccer scoreboard** (`uefa.champions`, no API key) is the
sole data source. Unlike wc2026 there is no static draw constant: clubs are
discovered dynamically from the events themselves (ESPN team id is the
stable key), so the app self-populates when the league-phase draw lands in
late August 2026 and fixtures are published. The scheduler refreshes hourly
in-process via APScheduler; failure is silent — stale data beats no data.

Round tags come from ESPN's `season.slug` (verified against 2025/26):
`league-phase`, `knockout-round-playoffs`, `round-of-16`, `quarterfinals`,
`semifinals`, `final`. League matchday numbers (1-8) are derived by
clustering match dates, since the scoreboard has no week field.

## Backend layout

```
backend/
├─ main.py               — FastAPI app + lifespan (create tables, refresh, scheduler)
├─ database.py           — SQLAlchemy engine/session
├─ models.py             — Team / Player (scorers) / Fixture (all rounds)
├─ schemas.py            — Pydantic response models
├─ routers/
│  ├─ table.py           — /table (single 36-club league table + zones)
│  ├─ fixtures.py        — /fixtures[?round=&matchday=&status=], /fixtures/today
│  ├─ knockout.py        — /knockout (rounds → two-leg ties with aggregates)
│  └─ scorers.py         — /scorers
└─ services/
   ├─ espn_fetcher.py    — Pull events/teams/scorers from ESPN
   ├─ scheduler.py       — Hourly APScheduler job (SEASON_ACTIVE gate)
   ├─ standings.py       — Compute the league table from played fixtures
   └─ auth.py            — HTTP Basic auth for /admin/*
```

## Frontend pages

```
app/
├─ page.tsx              — Dashboard (today + top 8 + top scorers)
├─ table/page.tsx        — Full 36-club table with qualification zones
├─ fixtures/page.tsx     — League fixtures with a matchday filter
├─ knockout/page.tsx     — Play-offs → final as two-leg ties
└─ scorers/page.tsx      — Top-scorer race
```

All pages are server-rendered with `revalidate: 300` (5 min) so the public
site always reflects the hourly DB refresh without hammering the API.

## Operations

| Action                 | Endpoint               |
|------------------------|------------------------|
| Health / counts        | `GET  /status`         |
| Force ESPN refresh now | `POST /admin/refresh`  |
| Last refresh summary   | `GET  /admin/last-summary` |
| Swagger UI             | `GET  /docs`           |

## Local dev

```bash
# backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # set DATABASE_URL
uvicorn main:app --reload --host 0.0.0.0 --port 9004

# frontend
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:9004 npm run dev
```

## Deploy

The GitHub workflow at `.github/workflows/apps-ucl.yml` deploys backend and
frontend independently on push (paths-filter). Backend pulls `.env` from
`s3://ucl.nasir.id/backend/.env` before building.
