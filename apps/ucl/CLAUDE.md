# ucl — UEFA Champions League 2026/27 wall chart

Live UCL 2026/27 site: 36-club league-phase table, fixtures by matchday,
two-legged knockout ties, top scorers. Modeled on `apps/wc2026` but adapted
to the Swiss-model format and fully dynamic (no static draw constant).

| Piece    | Stack      | Port | Domain                   | Container    |
|----------|------------|------|--------------------------|--------------|
| Frontend | Next.js 16 | 5004 | https://ucl.nasir.id     | ucl-frontend |
| Backend  | FastAPI    | 9004 | https://api.ucl.nasir.id | ucl-backend  |
| DB       | PostgreSQL | —    | `ucl` on the server      | —            |

## Data flow (backend)

ESPN's public scoreboard (`site.api.espn.com/.../soccer/uefa.champions/scoreboard`,
no key) is the **sole** data source, fetched hourly by APScheduler
(`services/scheduler.py`, gated by `SEASON_ACTIVE`) and on startup.
`services/espn_fetcher.py`:

- Fetches the fixed season window `ESPN_START_DATE..ESPN_END_DATE`
  (2026-08-01 → 2027-06-06) in 10-day chunks (ESPN caps ~100
  events/response). **The window must open before matchday 1, which was
  played 8-10 Sep 2026** — the original 2026-09-14 start silently dropped
  MD1's 18 fixtures, leaving the table at 0-0 for every club. Qualifiers
  can't leak in: ESPN serves them under a different league code (this
  endpoint returns nothing before MD1) and unmapped slugs are ignored.
  The date also lives in the S3 `.env`, which overrides the code default —
  the workflow rewrites a stale value in place.
- **Teams are upserted dynamically** from event competitor blocks, keyed by
  ESPN team id (`Team.espn_id`); crest URL in `Team.logo`. Empty DB before
  the draw (late Aug 2026) is expected — the site self-populates.
- Round comes from `season.slug`: `league-phase`, `knockout-round-playoffs`,
  `round-of-16`, `quarterfinals`, `semifinals`, `final` → Fixture.round_code
  `league|playoff|r16|qf|sf|final`. One `fixtures` table for everything;
  there is no separate knockout table.
- **Matchday 1-8 is derived by date clustering** (gap >3 days = new matchday)
  since ESPN has no week field. Needs `db.flush()` before the pass — the
  session is `autoflush=False` (this was a real bug once).
- Scores are only trusted when status is live/finished (ESPN reports "0"
  pre-kickoff). Scorer `Player` rows are created on demand from scoring
  plays (no squads); own goals and shootout kicks (stamped at clock 7200)
  are excluded.

Highlight videos aren't in ESPN, so they're curated in
`backend/data/match_videos.json` (club names, accent/case-insensitive) and
written to `Fixture.video_url` at the end of every refresh by
`services/videos.py` — ESPN upserts never touch that column. Add a matchday's
links to the file and redeploy; an entry matching no fixture is logged as
`unmatched` in the refresh summary rather than failing silently. The fixtures
list shows a YouTube icon for any fixture that has one.

Knockout ties (two legs + aggregate + winner) are computed in
`routers/knockout.py` by grouping same-round fixtures by team pair; the
final is single-leg and may carry a shootout score.

## API

`/table` (standings + zones: 1-8 direct, 9-24 playoff, 25-36 out) ·
`/fixtures[?round=&matchday=&status=]` · `/fixtures/today` ·
`/fixtures/upcoming?limit=` (next unfinished matches, live first — the home
page's "next 5") · `/knockout` ·
`/scorers?limit=` · `/teams` · `/teams/{id}` (club + standing + fixtures +
scorers) · `/status` · `/docs`. Team rows carry `color`/`venue`/`city`/
`country`, learned from ESPN competitor blocks and home-fixture venue
addresses (final skipped — neutral venue); `main.run_migrations()` adds
these columns to a pre-existing `teams` table. Admin (HTTP Basic from env):
`GET /admin/check`, `POST /admin/refresh`, `GET /admin/last-summary`.
Frontend `/admin` page uses these (creds in sessionStorage).

## Deploy & ops

Push to `main` touching `apps/ucl/**` → `.github/workflows/apps-ucl.yml` on
the self-hosted runner (on the server) rebuilds and restarts both containers.
Backend `.env` is pulled from `s3://ucl.nasir.id/backend/.env`; if missing
**or still containing the `.env.example` placeholder DATABASE_URL**, the
workflow regenerates it (DB URL derived from wc2026's .env — same Postgres,
db name `ucl` — plus a random `ADMIN_PASSWORD`). The backend creates the
`ucl` database itself on first start (`ensure_database()` in `database.py`)
because **Postgres port 5432 is firewalled — unreachable from the dev
machine**, as are the S3 buckets (local AWS creds have no access; anything
needing them must run in a workflow step).

To check deploys without `gh` (not installed): token is in the git remote
URL; curl the GitHub REST API for workflow runs / job logs.

## Testing without prod DB

Point `DATABASE_URL` at SQLite (handled in `database.py`) and replay the
completed 2025/26 season — a full end-to-end validation:

```bash
cd backend
DATABASE_URL=sqlite:///test.db ESPN_START_DATE=2025-09-15 ESPN_END_DATE=2026-05-31 \
python -c "from database import engine,Base; import models; Base.metadata.create_all(bind=engine); \
from services.espn_fetcher import refresh_from_espn; print(refresh_from_espn())"
```

Expected: 36 teams, 189 fixtures (144 league = 8 matchdays × 18, 16 playoff,
16 r16, 8 qf, 4 sf, 1 final), 0 errors, PSG winning the final.
Frontend: `npm run build` in `frontend/` catches type errors pre-deploy
(Docker build uses `--build-arg NEXT_PUBLIC_API_URL=https://api.ucl.nasir.id`).

## After the 2027 final

Set `SEASON_ACTIVE=false` in the S3 .env and redeploy — data is then served
as-is from the DB with no ESPN polling.
