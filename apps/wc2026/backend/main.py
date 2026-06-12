"""FastAPI entry point for the wc2026 backend."""
import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import engine, Base, SessionLocal
from models import Team, Player, Fixture, KnockoutMatch  # noqa: F401 — register models
from routers import groups, fixtures, knockout, squads, scorers
from schemas import StatusOut
from services.scheduler import start_scheduler, get_last_refresh, get_last_summary
from services.espn_fetcher import refresh_from_espn
from seed_from_excel import seed

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    # Seed on every boot (idempotent — upserts only).
    try:
        seed()
    except Exception as e:
        logger.exception("seed_from_excel failed at startup: %s", e)

    sched = start_scheduler()
    yield
    sched.shutdown(wait=False)


app = FastAPI(title="WC 2026 API", version="0.1.0", lifespan=lifespan)

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
            last_refresh=get_last_refresh(),
        )
    finally:
        db.close()


@app.post("/admin/refresh")
def manual_refresh():
    """Trigger an immediate ESPN refresh (also runs on the hourly schedule)."""
    return refresh_from_espn()


@app.post("/admin/reseed")
def manual_reseed():
    """Re-run the spreadsheet seeder."""
    return seed()
