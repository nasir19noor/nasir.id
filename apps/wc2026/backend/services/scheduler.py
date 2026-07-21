"""APScheduler wrapper.

The tournament is over, so the periodic ESPN refresh is disabled by default —
the data in the database is final. Set TOURNAMENT_ACTIVE=true to re-enable the
hourly ESPN + highlights refresh (e.g. for a future tournament).
"""
import os
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from services.espn_fetcher import refresh_from_espn
from services.highlights import refresh_highlights

logger = logging.getLogger(__name__)

_state = {"last_refresh": None, "last_summary": None, "last_highlights": None}


def tournament_active() -> bool:
    return os.getenv("TOURNAMENT_ACTIVE", "false").lower() in ("1", "true", "yes")


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

    try:
        _state["last_highlights"] = refresh_highlights()
    except Exception as e:
        logger.exception("scheduled highlights refresh failed: %s", e)


def start_scheduler() -> BackgroundScheduler:
    sched = BackgroundScheduler(timezone="UTC")

    if not tournament_active():
        # Tournament complete — no periodic fetching. Data is served as-is from
        # the database. The scheduler still starts (so shutdown is a no-op) but
        # registers no jobs.
        sched.start()
        logger.info("Scheduler idle — TOURNAMENT_ACTIVE is false; ESPN refresh "
                    "and predictions are disabled (tournament complete).")
        return sched

    minutes = int(os.getenv("REFRESH_INTERVAL_MIN", "60"))
    sched.add_job(_job, "interval", minutes=minutes, id="espn_refresh",
                  next_run_time=datetime.now(timezone.utc))
    sched.start()
    logger.info("Scheduler started — ESPN + highlights every %d min.", minutes)
    return sched
