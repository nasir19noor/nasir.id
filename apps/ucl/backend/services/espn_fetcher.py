"""
Pull UEFA Champions League 2026/27 data from ESPN's public scoreboard endpoint.

This module is the sole runtime data source. Unlike wc2026 there is no static
draw constant: the 36 league-phase clubs are discovered from the events
themselves (ESPN team id is the stable key), so the app self-populates when
the draw lands and fixtures are published.

  1. Fetch the season window in chunks (ESPN caps ~100 events per request).
  2. Upsert every competitor as a Team (crest URL included).
  3. Upsert every event as a Fixture tagged with its round (season.slug).
  4. Derive league-phase matchday numbers by clustering match dates — the
     soccer scoreboard has no week/matchday field.
  5. Rebuild top-scorer totals from scoring plays.
"""
import os
import logging
import unicodedata
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

import requests
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Fixture, Player, Team

logger = logging.getLogger(__name__)

ESPN_URL = os.getenv(
    "ESPN_SCOREBOARD_URL",
    "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard",
)
# Fixed season window: league phase MD1 (16 Sep 2026) → final (Jun 2027).
# Starting after the August qualifying rounds keeps qualifiers out of the DB.
ESPN_START_DATE = os.getenv("ESPN_START_DATE", "2026-09-14")
ESPN_END_DATE   = os.getenv("ESPN_END_DATE",   "2027-06-06")
# One league matchday is 18 matches over 2-3 days; 10-day chunks stay well
# under ESPN's ~100-event response cap.
ESPN_CHUNK_DAYS = int(os.getenv("ESPN_CHUNK_DAYS", "10"))

# ESPN tags each event's round via season.slug (verified against the 2025/26
# season). Anything unmapped is ignored — e.g. qualifying legs.
ESPN_ROUND_SLUGS = {
    "league-phase":            "league",
    "knockout-round-playoffs": "playoff",
    "round-of-16":             "r16",
    "quarterfinals":           "qf",
    "semifinals":              "sf",
    "final":                   "final",
}

LEAGUE_MATCHDAYS = 8


# ─── Fetch ────────────────────────────────────────────────────────

def _fetch_window() -> tuple[date, date]:
    """±1-day buffer guards against timezone edges on first/last match days."""
    try:
        s = date.fromisoformat(ESPN_START_DATE) - timedelta(days=1)
        e = date.fromisoformat(ESPN_END_DATE) + timedelta(days=1)
        return s, e
    except ValueError:
        logger.warning("Invalid ESPN_START_DATE/ESPN_END_DATE; using rolling window")
        today = datetime.now(timezone.utc).date()
        return today - timedelta(days=30), today + timedelta(days=30)


def _fetch_events() -> list[dict]:
    """Fetch all events across the season window, chunked and de-duplicated."""
    start, end = _fetch_window()
    events_by_id: dict[str, dict] = {}
    cur = start
    step = timedelta(days=ESPN_CHUNK_DAYS)
    while cur <= end:
        chunk_end = min(cur + step - timedelta(days=1), end)
        params = {"dates": f"{cur.strftime('%Y%m%d')}-{chunk_end.strftime('%Y%m%d')}"}
        try:
            r = requests.get(ESPN_URL, params=params, timeout=20)
            r.raise_for_status()
            batch = r.json().get("events", []) or []
            for ev in batch:
                events_by_id[str(ev.get("id") or id(ev))] = ev
            if len(batch) >= 100:
                logger.warning("ESPN chunk %s hit the ~100-event cap; "
                               "reduce ESPN_CHUNK_DAYS", params["dates"])
        except Exception as e:
            logger.warning("ESPN fetch failed for %s: %s", params["dates"], e)
        cur = chunk_end + timedelta(days=1)
    logger.info("ESPN fetch: %d events across %s..%s", len(events_by_id), start, end)
    return list(events_by_id.values())


# ─── Teams ────────────────────────────────────────────────────────

def _upsert_team(db: Session, idx: dict[str, Team], block: dict) -> Team | None:
    """Get-or-create a Team from an ESPN competitor team block."""
    espn_id = str(block.get("id") or "")
    name    = block.get("displayName") or block.get("shortDisplayName") or block.get("name")
    if not espn_id or not name:
        return None
    team = idx.get(espn_id)
    if team is None:
        team = Team(espn_id=espn_id, name=name)
        db.add(team)
        db.flush()
        idx[espn_id] = team
    # Refresh metadata (crests occasionally change CDN paths).
    team.name = name
    if block.get("abbreviation"):
        team.code = str(block["abbreviation"])[:8]
    if block.get("logo"):
        team.logo = block["logo"]
    return team


# ─── Fixtures ─────────────────────────────────────────────────────

def _to_int(v):
    if v is None or v == "":
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def _parse_event(db: Session, ev: dict, idx: dict[str, Team]) -> dict | None:
    season_slug = ((ev.get("season") or {}).get("slug") or "").lower()
    round_code = ESPN_ROUND_SLUGS.get(season_slug)
    if round_code is None:
        return None  # qualifying round or untagged — not part of the wall chart

    comp = (ev.get("competitions") or [{}])[0]
    home = away = None
    home_score = away_score = home_so = away_so = None
    for c in comp.get("competitors") or []:
        team = _upsert_team(db, idx, c.get("team") or {})
        if c.get("homeAway") == "home":
            home, home_score, home_so = team, c.get("score"), c.get("shootoutScore")
        elif c.get("homeAway") == "away":
            away, away_score, away_so = team, c.get("score"), c.get("shootoutScore")
    if not home or not away:
        return None

    iso = ev.get("date")
    try:
        kickoff = datetime.fromisoformat(iso.replace("Z", "+00:00")) if iso else None
    except ValueError:
        kickoff = None

    state = ((comp.get("status") or {}).get("type") or {}).get("state", "pre")
    status_map = {"pre": "scheduled", "in": "live", "post": "finished"}

    return {
        "espn_event_id": str(ev.get("id")),
        "round_code":    round_code,
        "home":          home,
        "away":          away,
        "home_score":    _to_int(home_score),
        "away_score":    _to_int(away_score),
        "home_shootout": _to_int(home_so),
        "away_shootout": _to_int(away_so),
        "kickoff":       kickoff,
        "status":        status_map.get(state, "scheduled"),
        "venue":         ((comp.get("venue") or {}).get("fullName")),
    }


def _upsert_fixture(db: Session, p: dict) -> None:
    fx = (db.query(Fixture)
            .filter(Fixture.espn_event_id == p["espn_event_id"])
            .one_or_none())
    if fx is None:
        fx = Fixture(espn_event_id=p["espn_event_id"])
        db.add(fx)
    fx.round_code   = p["round_code"]
    fx.home_team_id = p["home"].id
    fx.away_team_id = p["away"].id
    if p["kickoff"]: fx.kickoff = p["kickoff"]
    if p["venue"]:   fx.venue   = p["venue"]
    fx.status = p["status"]
    # ESPN reports score "0" before kickoff. Only trust scores once live or
    # finished, so standings never count unplayed games as 0-0 draws.
    if p["status"] in ("live", "finished") \
       and p["home_score"] is not None and p["away_score"] is not None:
        fx.home_score    = p["home_score"]
        fx.away_score    = p["away_score"]
        fx.home_shootout = p["home_shootout"]
        fx.away_shootout = p["away_shootout"]
    else:
        fx.home_score = fx.away_score = None
        fx.home_shootout = fx.away_shootout = None


def _assign_matchdays(db: Session) -> int:
    """Number league-phase fixtures 1..8 by clustering their kickoff dates.

    A matchday spans 2-3 consecutive evenings (Tue/Wed, plus Thu on MD1); the
    gap to the next matchday is always ≥ a week. Dates ≤3 days apart therefore
    belong to the same matchday. Runs over the full fixture list every refresh,
    so it self-corrects when UEFA reschedules a match.
    """
    fixtures = (db.query(Fixture)
                  .filter(Fixture.round_code == "league",
                          Fixture.kickoff.isnot(None))
                  .order_by(Fixture.kickoff)
                  .all())
    md, prev_day = 0, None
    for fx in fixtures:
        day = fx.kickoff.date()
        if prev_day is None or (day - prev_day).days > 3:
            md = min(md + 1, LEAGUE_MATCHDAYS)
        fx.matchday = md
        prev_day = day
    return md


# ─── Top scorers ──────────────────────────────────────────────────

def normalize_name(s: str) -> str:
    """Strip diacritics + case for player matching."""
    nfkd = unicodedata.normalize("NFKD", s or "")
    return "".join(c for c in nfkd if not unicodedata.combining(c)).strip().upper()


SHOOTOUT_CLOCK = 7200.0  # 120' — ESPN stamps every shootout kick at this clock


def _is_goal_play(detail: dict, match_has_shootout: bool) -> bool:
    """Open-play goals, headers, free-kicks and in-game penalties count; own
    goals and penalty-shootout kicks don't. Shootout kicks share the
    'Penalty - Scored' type with in-game penalties but are stamped at 120'."""
    if not detail.get("scoringPlay"):
        return False
    text = ((detail.get("type") or {}).get("text") or "")
    if "Own" in text:
        return False
    if "Goal" in text:
        return True
    if "Penalty - Scored" in text:
        if not match_has_shootout:
            return True
        clock = (detail.get("clock") or {}).get("value")
        return clock is not None and clock < SHOOTOUT_CLOCK
    return False


def _apply_goal_counts(db: Session, events: list[dict], idx: dict[str, Team]) -> dict:
    """Reset all goal tallies, then re-count from every event's scoring plays.
    Scorer Player rows are created on demand — there are no pre-loaded squads."""
    counts: dict[tuple[int, str], tuple[str, int]] = {}
    goals_seen = unresolved = 0

    for ev in events:
        comp = (ev.get("competitions") or [{}])[0]
        competitors = comp.get("competitors") or []
        has_shootout = any(c.get("shootoutScore") not in (None, "") for c in competitors)
        for d in comp.get("details") or []:
            if not _is_goal_play(d, has_shootout):
                continue
            athletes = d.get("athletesInvolved") or []
            scorer = athletes[0] if athletes else {}
            name = scorer.get("fullName") or scorer.get("displayName") or ""
            espn_team_id = str(
                ((scorer.get("team") or {}).get("id"))
                or ((d.get("team") or {}).get("id") or "")
            )
            goals_seen += 1
            team = idx.get(espn_team_id)
            if not name or not team:
                unresolved += 1
                continue
            key = (team.id, normalize_name(name))
            display, n = counts.get(key, (name, 0))
            counts[key] = (display, n + 1)

    db.query(Player).update({Player.goals: 0})
    existing = {(p.team_id, p.norm_name): p for p in db.query(Player).all()}
    for (team_id, norm), (display, n) in counts.items():
        p = existing.get((team_id, norm))
        if p is None:
            p = Player(team_id=team_id, name=display, norm_name=norm)
            db.add(p)
        p.name  = display
        p.goals = n

    return {"goals_seen": goals_seen, "scorers": len(counts), "unresolved": unresolved}


# ─── Entry point ──────────────────────────────────────────────────

def refresh_from_espn() -> dict:
    """Fetch the season window and upsert teams, fixtures and scorers.

    Errors are caught per-stage and surfaced in the response dict so
    /admin/refresh callers can see what broke without reading container logs.
    """
    db = SessionLocal()
    summary: dict = {"events": 0, "fixtures": 0, "matchdays": 0,
                     "scorers": {}, "errors": []}

    def _stage(name: str, fn):
        try:
            return fn()
        except Exception as e:
            db.rollback()
            logger.exception("ESPN refresh stage '%s' failed: %s", name, e)
            summary["errors"].append({"stage": name, "error": f"{type(e).__name__}: {e}"})
            return None

    try:
        events = _stage("fetch_events", _fetch_events) or []
        summary["events"] = len(events)
        if not events:
            return summary

        idx: dict[str, Team] = {t.espn_id: t for t in db.query(Team).all()}

        def _upsert_loop():
            n = 0
            for ev in events:
                p = _parse_event(db, ev, idx)
                if p:
                    _upsert_fixture(db, p)
                    n += 1
            # The session runs with autoflush=False, so push the pending
            # inserts now — the matchday pass below queries them back.
            db.flush()
            summary["fixtures"] = n
        _stage("upsert_fixtures", _upsert_loop)

        summary["matchdays"] = _stage("assign_matchdays",
                                      lambda: _assign_matchdays(db)) or 0
        summary["scorers"] = _stage("apply_goals",
                                    lambda: _apply_goal_counts(db, events, idx)) or {}
        db.commit()
    finally:
        db.close()
    logger.info("ESPN refresh: %s", summary)
    return summary
