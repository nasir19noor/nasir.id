"""FastAPI entry point for the ucl backend (UEFA Champions League 2026/27).

All data — clubs, fixtures, scores, scorers — comes from ESPN's public
scoreboard endpoint, refreshed hourly. There is no static draw: teams appear
automatically once the league-phase draw lands and ESPN publishes fixtures.
"""
import os
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import engine, Base, SessionLocal, ensure_database
from models import Team, Player, Fixture  # noqa: F401 — register models for create_all
from routers import table, fixtures, knockout, scorers
from schemas import StatusOut
from services.scheduler import start_scheduler, get_last_refresh, get_last_summary, season_active
from services.espn_fetcher import refresh_from_espn
from services.auth import require_admin

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_database()
    Base.metadata.create_all(bind=engine)

    if season_active():
        try:
            logger.info("Startup refresh: %s", refresh_from_espn())
        except Exception as e:
            logger.exception("Startup refresh failed: %s", e)
    else:
        logger.info("Startup ESPN refresh skipped — SEASON_ACTIVE=false.")

    sched = start_scheduler()
    yield
    sched.shutdown(wait=False)


app = FastAPI(title="UCL 2026/27 API", version="0.1.0", lifespan=lifespan)

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(table.router)
app.include_router(fixtures.router)
app.include_router(knockout.router)
app.include_router(scorers.router)


@app.get("/")
def root():
    return {"service": "ucl-api", "docs": "/docs", "status": "/status"}


@app.get("/status", response_model=StatusOut)
def status():
    db = SessionLocal()
    try:
        return StatusOut(
            seeded=bool(db.query(Team).count()),
            teams=db.query(Team).count(),
            players=db.query(Player).count(),
            fixtures=db.query(Fixture).count(),
            last_refresh=get_last_refresh(),
        )
    finally:
        db.close()


# ─── Admin (Basic Auth) ────────────────────────────────────────────

@app.get("/admin/check")
def admin_check(user: str = Depends(require_admin)):
    """Verify credentials (used by any admin tooling)."""
    return {"ok": True, "user": user}


@app.post("/admin/refresh")
def manual_refresh(user: str = Depends(require_admin)):
    """Trigger an immediate ESPN refresh (also runs hourly on the schedule)."""
    return refresh_from_espn()


@app.get("/admin/last-summary")
def last_summary(user: str = Depends(require_admin)):
    """The most recent scheduled refresh summary, for debugging."""
    return {"last_refresh": get_last_refresh(), "summary": get_last_summary()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9004)
