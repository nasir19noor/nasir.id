"""
Pull live World Cup scores from ESPN's public scoreboard endpoint.

Endpoint shape (no API key required):
  GET https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard
       ?dates=YYYYMMDD-YYYYMMDD

We parse each event, look up the two competitor short-names, and update the
matching Fixture / KnockoutMatch in our DB. We never insert new matches —
seeding owns the structure; this overlay only writes scores / kickoff / status.
"""
import os
import logging
from datetime import datetime, timedelta, timezone

import requests
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Fixture, KnockoutMatch, Team

logger = logging.getLogger(__name__)

ESPN_URL = os.getenv(
    "ESPN_SCOREBOARD_URL",
    "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard",
)
ESPN_WINDOW_DAYS = int(os.getenv("ESPN_WINDOW_DAYS", "14"))

# ESPN sometimes uses names slightly different from our codes — map by
# uppercase abbreviation; missing entries fall back to comparing names.
ESPN_ABBR_OVERRIDES: dict[str, str] = {
    "USA": "USA", "MEX": "MEX", "BRA": "BRA",
    # add more as we find mismatches in production logs
}


def _fetch_events() -> list[dict]:
    """Return raw ESPN events covering ±ESPN_WINDOW_DAYS from now."""
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=2)
    end   = today + timedelta(days=ESPN_WINDOW_DAYS)
    params = {"dates": f"{start.strftime('%Y%m%d')}-{end.strftime('%Y%m%d')}"}
    try:
        r = requests.get(ESPN_URL, params=params, timeout=20)
        r.raise_for_status()
        return r.json().get("events", []) or []
    except Exception as e:
        logger.warning("ESPN fetch failed: %s", e)
        return []


def _team_lookup(db: Session) -> dict[str, Team]:
    """Index teams by (uppercase code), (uppercase name), (uppercase short name)."""
    idx: dict[str, Team] = {}
    for t in db.query(Team).all():
        idx[t.code.upper()] = t
        idx[t.name.upper()] = t
    return idx


def _resolve_team(idx: dict[str, Team], competitor: dict) -> Team | None:
    team_block = competitor.get("team", {}) or {}
    for key in ("abbreviation", "shortDisplayName", "displayName", "name"):
        val = team_block.get(key)
        if val:
            t = idx.get(val.upper())
            if t:
                return t
    return None


def _parse_event(ev: dict, idx: dict[str, Team]) -> dict | None:
    comp = (ev.get("competitions") or [{}])[0]
    home = away = None
    home_score = away_score = None
    for c in comp.get("competitors", []) or []:
        team = _resolve_team(idx, c)
        if c.get("homeAway") == "home":
            home, home_score = team, c.get("score")
        elif c.get("homeAway") == "away":
            away, away_score = team, c.get("score")
    if not home or not away:
        return None

    kickoff = ev.get("date")
    try:
        kickoff_dt = datetime.fromisoformat(kickoff.replace("Z", "+00:00")) if kickoff else None
    except ValueError:
        kickoff_dt = None

    status = ((ev.get("status") or {}).get("type") or {}).get("state", "pre")
    status_map = {"pre": "scheduled", "in": "live", "post": "finished"}
    return {
        "espn_event_id": str(ev.get("id")),
        "home_id":       home.id,
        "away_id":       away.id,
        "home_score":    int(home_score) if home_score not in (None, "") else None,
        "away_score":    int(away_score) if away_score not in (None, "") else None,
        "kickoff":       kickoff_dt,
        "status":        status_map.get(status, "scheduled"),
        "venue":         ((comp.get("venue") or {}).get("fullName")),
    }


def refresh_from_espn() -> dict:
    """Pull ESPN scoreboard and overlay scores onto our seeded fixtures."""
    events = _fetch_events()
    if not events:
        return {"events": 0, "updated_group": 0, "updated_knockout": 0}

    db = SessionLocal()
    updated_group = updated_knockout = 0
    try:
        idx = _team_lookup(db)
        for ev in events:
            parsed = _parse_event(ev, idx)
            if not parsed:
                continue

            # Try group fixture first
            fx = (db.query(Fixture)
                    .filter(Fixture.home_team_id == parsed["home_id"],
                            Fixture.away_team_id == parsed["away_id"])
                    .one_or_none())
            if fx:
                _apply(fx, parsed)
                updated_group += 1
                continue

            # Otherwise knockout
            ko = (db.query(KnockoutMatch)
                    .filter(KnockoutMatch.home_team_id == parsed["home_id"],
                            KnockoutMatch.away_team_id == parsed["away_id"])
                    .one_or_none())
            if ko:
                _apply(ko, parsed)
                if parsed["status"] == "finished" and parsed["home_score"] is not None:
                    if parsed["home_score"] > parsed["away_score"]:
                        ko.winner_team_id = parsed["home_id"]
                    elif parsed["away_score"] > parsed["home_score"]:
                        ko.winner_team_id = parsed["away_id"]
                updated_knockout += 1
        db.commit()
    except Exception as e:
        db.rollback()
        logger.exception("ESPN refresh failed: %s", e)
    finally:
        db.close()
    summary = {
        "events":            len(events),
        "updated_group":     updated_group,
        "updated_knockout":  updated_knockout,
    }
    logger.info("ESPN refresh: %s", summary)
    return summary


def _apply(row, parsed: dict):
    row.espn_event_id = parsed["espn_event_id"]
    if parsed["kickoff"]:
        row.kickoff = parsed["kickoff"]
    if parsed["venue"]:
        row.venue = parsed["venue"]
    row.status = parsed["status"]
    if parsed["home_score"] is not None and parsed["away_score"] is not None:
        row.home_score = parsed["home_score"]
        row.away_score = parsed["away_score"]
