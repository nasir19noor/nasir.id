"""APScheduler wrapper — runs ESPN refresh once an hour."""
import os
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from services.espn_fetcher import refresh_from_espn
from services.predictions import run_daily_predictions

logger = logging.getLogger(__name__)

_state = {"last_refresh": None, "last_summary": None,
          "last_prediction": None, "last_prediction_summary": None}


def get_last_refresh() -> datetime | None:
    return _state["last_refresh"]


def get_last_summary() -> dict | None:
    return _state["last_summary"]


def get_last_prediction() -> datetime | None:
    return _state["last_prediction"]


def _job():
    try:
        summary = refresh_from_espn()
        _state["last_refresh"] = datetime.now(timezone.utc)
        _state["last_summary"] = summary
    except Exception as e:
        logger.exception("scheduled refresh failed: %s", e)


def _prediction_job():
    try:
        summary = run_daily_predictions()
        _state["last_prediction"] = datetime.now(timezone.utc)
        _state["last_prediction_summary"] = summary
        logger.info("daily predictions complete")
    except Exception as e:
        logger.exception("scheduled prediction failed: %s", e)


def start_scheduler() -> BackgroundScheduler:
    minutes = int(os.getenv("REFRESH_INTERVAL_MIN", "60"))
    sched = BackgroundScheduler(timezone="UTC")

    # Hourly ESPN refresh.
    sched.add_job(_job, "interval", minutes=minutes, id="espn_refresh",
                  next_run_time=datetime.now(timezone.utc))

    # AI predictions every 6 hours at 00:00 / 06:00 / 12:00 / 18:00 WIB.
    pred_hours  = os.getenv("PREDICTION_HOURS", "0,6,12,18")
    pred_minute = int(os.getenv("PREDICTION_MINUTE", "0"))
    sched.add_job(
        _prediction_job,
        CronTrigger(hour=pred_hours, minute=pred_minute, timezone="Asia/Jakarta"),
        id="predictions",
    )

    sched.start()
    logger.info("Scheduler started — ESPN every %d min; predictions at "
                "%s:%02d WIB", minutes, pred_hours, pred_minute)
    return sched
