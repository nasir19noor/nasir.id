"""One-time backfill of match attendance from ESPN's per-match summary.

The scoreboard feed the app pulls hourly carries scores and venue name, but not
attendance — that lives in the summary endpoint's `gameInfo.attendance`. Not
part of the regular refresh cycle (tournament is complete); triggered once via
POST /admin/enrich-attendance. Also backfills venue if it was ever missing.
"""
import logging

import requests
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Fixture
from services.espn_fetcher import ESPN_URL

logger = logging.getLogger(__name__)

SUMMARY_URL = ESPN_URL.replace("/scoreboard", "/summary")


def enrich_attendance() -> dict:
    db: Session = SessionLocal()
    summary = {"fixtures": 0, "updated": 0, "no_attendance": 0, "errors": []}
    try:
        fixtures = (db.query(Fixture)
                      .filter(Fixture.espn_event_id.isnot(None),
                              Fixture.status == "finished")
                      .all())
        summary["fixtures"] = len(fixtures)
        session = requests.Session()

        for f in fixtures:
            try:
                r = session.get(SUMMARY_URL, params={"event": f.espn_event_id}, timeout=20)
                r.raise_for_status()
                data = r.json()
            except Exception as e:
                summary["errors"].append(f"{f.espn_event_id}: {type(e).__name__}")
                continue

            game_info = data.get("gameInfo") or {}
            attendance = game_info.get("attendance")
            venue_name = ((game_info.get("venue") or {}).get("fullName"))

            if attendance:
                f.attendance = int(attendance)
                summary["updated"] += 1
            else:
                summary["no_attendance"] += 1
            if venue_name and not f.venue:
                f.venue = venue_name

        db.commit()
    finally:
        db.close()
    logger.info("attendance enrichment: %s", {k: v for k, v in summary.items() if k != "errors"})
    return summary
