"""FastAPI entry point for the wc2026 backend.

Data flow:
  • The FIFA draw (which teams are in which group) is a small static constant
    in services/wc2026_data.py — public structural data, not "fetched".
  • All live data (fixtures, scores, kickoffs, venues, knockout matches) comes
    from ESPN's public scoreboard endpoint, refreshed hourly.
"""
import os
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from sqlalchemy import inspect, text

from database import engine, Base, SessionLocal
from models import (  # noqa: F401 — register models for create_all
    Team, Player, Fixture, KnockoutMatch, PageView, Prediction, MatchPredictionRow,
    MatchHighlight,
)
from routers import groups, fixtures, knockout, squads, scorers, awards, statistics
from schemas import StatusOut
from services.scheduler import start_scheduler, get_last_refresh, tournament_active
from services.espn_fetcher import refresh_from_espn, ensure_structure
from services.highlights import refresh_highlights
from services.squads_loader import load_squads
from services.stats_enricher import enrich_player_stats
from services.auth import require_admin
from services import analytics

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def run_migrations() -> None:
    """
    Bring legacy schemas up to date. create_all() only creates *new* tables,
    so anything that needs to widen an existing column or add a missing one
    goes here. Idempotent — each step checks current state first.
    """
    insp = inspect(engine)

    if not insp.has_table("teams"):
        return  # fresh DB — create_all will produce the right schema

    teams_cols = {c["name"]: c for c in insp.get_columns("teams")}

    # iso2 was originally VARCHAR(2). Some federations need wider ('gb-sct',
    # 'gb-eng', 'gb-wls'). Widen if too narrow.
    iso2_type = str(teams_cols.get("iso2", {}).get("type", ""))
    if "VARCHAR(2)" in iso2_type.upper() or iso2_type.upper() == "VARCHAR(2)":
        logger.info("Migration: widening teams.iso2 → VARCHAR(16)")
        with engine.begin() as c:
            c.execute(text("ALTER TABLE teams ALTER COLUMN iso2 TYPE VARCHAR(16)"))

    # page_views gained geo-detail columns after first release. Add any missing.
    if insp.has_table("page_views"):
        pv_cols = {c["name"] for c in insp.get_columns("page_views")}
        for col in ("country_name", "region", "city", "timezone", "isp"):
            if col not in pv_cols:
                logger.info("Migration: adding page_views.%s", col)
                with engine.begin() as c:
                    c.execute(text(f"ALTER TABLE page_views ADD COLUMN {col} VARCHAR"))

    # knockout_matches gained penalty-shootout score columns. Add if missing.
    if insp.has_table("knockout_matches"):
        ko_cols = {c["name"] for c in insp.get_columns("knockout_matches")}
        for col in ("home_shootout", "away_shootout"):
            if col not in ko_cols:
                logger.info("Migration: adding knockout_matches.%s", col)
                with engine.begin() as c:
                    c.execute(text(f"ALTER TABLE knockout_matches ADD COLUMN {col} INTEGER"))

    # players gained enriched stat columns (assists, cards, shots, saves).
    if insp.has_table("players"):
        p_cols = {c["name"] for c in insp.get_columns("players")}
        for col in ("assists", "yellow_cards", "red_cards",
                    "shots", "shots_on_target", "saves"):
            if col not in p_cols:
                logger.info("Migration: adding players.%s", col)
                with engine.begin() as c:
                    c.execute(text(f"ALTER TABLE players ADD COLUMN {col} INTEGER DEFAULT 0"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    try:
        run_migrations()
    except Exception as e:
        logger.exception("Migrations failed: %s", e)

    # Order matters: structure → squads → ESPN. The ESPN refresh attributes
    # goal scorers to existing Player rows, so squads must be present first.
    # Each step is wrapped — a failure logs but doesn't take the API down.

    try:
        db = SessionLocal()
        try:
            logger.info("Startup ensure_structure: %s", ensure_structure(db))
        finally:
            db.close()
    except Exception as e:
        logger.exception("Startup ensure_structure failed: %s", e)

    try:
        logger.info("Startup squads: %s", load_squads())
    except Exception as e:
        logger.exception("Startup squads load failed: %s", e)

    # Tournament is complete: don't re-fetch from ESPN on startup — the DB holds
    # the final data. Re-enable with TOURNAMENT_ACTIVE=true for a live event.
    if tournament_active():
        try:
            logger.info("Startup refresh: %s", refresh_from_espn())
        except Exception as e:
            logger.exception("Startup refresh failed: %s", e)
    else:
        logger.info("Startup ESPN refresh skipped — tournament complete "
                    "(TOURNAMENT_ACTIVE=false).")

    sched = start_scheduler()
    yield
    sched.shutdown(wait=False)


app = FastAPI(title="WC 2026 API", version="0.2.0", lifespan=lifespan)

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(groups.router)
app.include_router(fixtures.router)
app.include_router(knockout.router)
app.include_router(squads.router)
app.include_router(scorers.router)
app.include_router(awards.router)
app.include_router(statistics.router)


@app.get("/")
def root():
    return {"service": "wc2026-api", "docs": "/docs", "status": "/status"}


@app.get("/status", response_model=StatusOut)
def status():
    db = SessionLocal()
    try:
        return StatusOut(
            seeded=bool(db.query(Team).count()),
            teams=db.query(Team).count(),
            players=db.query(Player).count(),
            fixtures=db.query(Fixture).count(),
            knockout_matches=db.query(KnockoutMatch).count(),
            highlights=db.query(MatchHighlight).count(),
            last_refresh=get_last_refresh(),
        )
    finally:
        db.close()


# ─── Admin (Basic Auth) ────────────────────────────────────────────

@app.get("/admin/check")
def admin_check(user: str = Depends(require_admin)):
    """Used by the frontend login form to verify credentials."""
    return {"ok": True, "user": user}


@app.post("/admin/refresh")
def manual_refresh(user: str = Depends(require_admin)):
    """Trigger an immediate ESPN refresh + FolaPlay highlights refresh (both also
    run hourly on the schedule)."""
    return {"espn": refresh_from_espn(), "highlights": refresh_highlights()}


@app.post("/admin/load-squads")
def manual_load_squads(user: str = Depends(require_admin)):
    """Re-import squads + tournament goal totals from the wall-chart spreadsheet."""
    return load_squads()


@app.post("/admin/enrich-stats")
def manual_enrich_stats(user: str = Depends(require_admin)):
    """One-time: pull per-player assists, cards, shots and saves from ESPN match
    summaries onto the Player rows. Safe to re-run (resets then re-sums)."""
    return enrich_player_stats()


@app.get("/admin/analytics")
def admin_analytics(
    days: int = 7,
    top:  int = 10,
    recent: int = 20,
    user: str = Depends(require_admin),
):
    """Aggregated visitor analytics + recent activity for the admin dashboard."""
    return analytics.summary(days=days, top=top, recent=recent)


# ─── Public tracking beacon ────────────────────────────────────────

class TrackIn(BaseModel):
    path:     str = Field(default="/")
    referrer: str | None = None


@app.post("/track")
def track(payload: TrackIn, request: Request):
    """Record one page view. Called by the frontend on every page mount."""
    # Trust X-Forwarded-For when a reverse proxy sets it; otherwise use the
    # direct peer. CF-IPCountry is set when the request goes through
    # Cloudflare's proxy (orange-cloud). Both are optional.
    xff = request.headers.get("x-forwarded-for", "")
    ip  = xff.split(",")[0].strip() if xff else (request.client.host if request.client else None)
    analytics.record_view(
        path=payload.path or "/",
        ip=ip,
        user_agent=request.headers.get("user-agent", ""),
        referrer=payload.referrer,
        country=request.headers.get("cf-ipcountry"),
    )
    return {"ok": True}
