"""APScheduler wrapper — runs ESPN refresh once an hour."""
import os
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from services.espn_fetcher import refresh_from_espn

logger = logging.getLogger(__name__)

_state = {"last_refresh": None, "last_summary": None}


def get_last_refresh() -> datetime | None:
    return _state["last_refresh"]


def get_last_summary() -> dict | None:
    return _state["last_summary"]


def _job():
    try:
        summary = refresh_from_espn()
        _state["last_refresh"] = datetime.now(timezone.utc)
        _state["last_summary"] = summary
    except Exception as e:
        logger.exception("scheduled refresh failed: %s", e)


def start_scheduler() -> BackgroundScheduler:
    minutes = int(os.getenv("REFRESH_INTERVAL_MIN", "60"))
    sched = BackgroundScheduler(timezone="UTC")
    sched.add_job(_job, "interval", minutes=minutes, id="espn_refresh",
                  next_run_time=datetime.now(timezone.utc))
    sched.start()
    logger.info("Scheduler started — refresh every %d minute(s)", minutes)
    return sched
