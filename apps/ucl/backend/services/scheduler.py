"""APScheduler wrapper — hourly ESPN refresh while the season is active.

Set SEASON_ACTIVE=false once the 2026/27 season ends to stop fetching and
serve the final data as-is from the database.
"""
import os
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from services.espn_fetcher import refresh_from_espn

logger = logging.getLogger(__name__)

_state = {"last_refresh": None, "last_summary": None}


def season_active() -> bool:
    return os.getenv("SEASON_ACTIVE", "true").lower() in ("1", "true", "yes")


def get_last_refresh() -> datetime | None:
    return _state["last_refresh"]


def get_last_summary() -> dict | None:
    return _state["last_summary"]


def _job():
    try:
        _state["last_summary"] = refresh_from_espn()
        _state["last_refresh"] = datetime.now(timezone.utc)
    except Exception as e:
        logger.exception("scheduled refresh failed: %s", e)


def start_scheduler() -> BackgroundScheduler:
    sched = BackgroundScheduler(timezone="UTC")

    if not season_active():
        sched.start()
        logger.info("Scheduler idle — SEASON_ACTIVE is false; ESPN refresh disabled.")
        return sched

    minutes = int(os.getenv("REFRESH_INTERVAL_MIN", "60"))
    sched.add_job(_job, "interval", minutes=minutes, id="espn_refresh")
    sched.start()
    logger.info("Scheduler started — ESPN refresh every %d min.", minutes)
    return sched
