"""
Pull World Cup 2026 data from ESPN's public scoreboard endpoint.

This module is the **sole runtime data source**. It:

  1. Ensures the 48 teams + empty knockout bracket exist
     (using the small static FIFA draw constant in `wc2026_data.py`).
  2. Pulls a wide date window from ESPN.
  3. Upserts every event as either a group-stage Fixture or a KnockoutMatch
     depending on whether the two competitors are in the same drawn group.

No spreadsheet, no per-match seeding. Everything is dynamic.
"""
import os
import logging
import unicodedata
from collections import defaultdict
from datetime import datetime, timedelta, timezone

import requests
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Fixture, KnockoutMatch, Player, Team
from services.wc2026_data import (
    WC2026_GROUPS, TEAM_META, TEAM_GROUP, KNOCKOUT_SHAPE, team_lookup_code,
)

logger = logging.getLogger(__name__)

ESPN_URL = os.getenv(
    "ESPN_SCOREBOARD_URL",
    "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard",
)
ESPN_BACK_DAYS    = int(os.getenv("ESPN_BACK_DAYS",    "10"))
ESPN_FORWARD_DAYS = int(os.getenv("ESPN_FORWARD_DAYS", "40"))


# ─── Bootstrap: teams + empty knockout bracket ────────────────────

def ensure_structure(db: Session) -> dict:
    """Idempotently create the 48 teams and the empty knockout bracket."""
    teams_added = 0
    for letter, codes in WC2026_GROUPS.items():
        for code in codes:
            existing = db.query(Team).filter(Team.code == code).one_or_none()
            name, iso2 = TEAM_META.get(code, (code, None))
            if existing is None:
                db.add(Team(code=code, name=name, iso2=iso2, group_letter=letter))
                teams_added += 1
            else:
                # Backfill metadata on existing rows without overwriting good data.
                if not existing.iso2:         existing.iso2 = iso2
                if existing.group_letter != letter: existing.group_letter = letter
                if existing.name in (None, "", code): existing.name = name

    bracket_added = 0
    for round_code, slot_count in KNOCKOUT_SHAPE:
        for slot in range(1, slot_count + 1):
            exists = (db.query(KnockoutMatch)
                        .filter(KnockoutMatch.round_code == round_code,
                                KnockoutMatch.slot       == slot)
                        .one_or_none())
            if exists is None:
                db.add(KnockoutMatch(
                    round_code=round_code,
                    slot=slot,
                    home_label=f"TBD {round_code.upper()} #{slot} home",
                    away_label=f"TBD {round_code.upper()} #{slot} away",
                ))
                bracket_added += 1

    db.commit()
    logger.info("ensure_structure: %d new teams, %d new bracket slots",
                teams_added, bracket_added)
    return {"teams_added": teams_added, "bracket_added": bracket_added}


# ─── ESPN fetch ───────────────────────────────────────────────────

def _fetch_events() -> list[dict]:
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=ESPN_BACK_DAYS)
    end   = today + timedelta(days=ESPN_FORWARD_DAYS)
    params = {"dates": f"{start.strftime('%Y%m%d')}-{end.strftime('%Y%m%d')}"}
    try:
        r = requests.get(ESPN_URL, params=params, timeout=20)
        r.raise_for_status()
        return r.json().get("events", []) or []
    except Exception as e:
        logger.warning("ESPN fetch failed: %s", e)
        return []


def _resolve_team(idx: dict[str, Team], competitor: dict) -> Team | None:
    block = competitor.get("team") or {}
    for key in ("abbreviation", "shortDisplayName", "displayName", "name"):
        val = block.get(key)
        if val:
            code = team_lookup_code(str(val))
            t = idx.get(code) or idx.get(val.upper())
            if t:
                return t
    return None


def _parse_event(ev: dict, idx: dict[str, Team]) -> dict | None:
    comp = (ev.get("competitions") or [{}])[0]
    home = away = None
    home_score = away_score = None
    for c in comp.get("competitors") or []:
        team = _resolve_team(idx, c)
        if c.get("homeAway") == "home":
            home, home_score = team, c.get("score")
        elif c.get("homeAway") == "away":
            away, away_score = team, c.get("score")
    if not home or not away:
        return None

    iso = ev.get("date")
    try:
        kickoff = datetime.fromisoformat(iso.replace("Z", "+00:00")) if iso else None
    except ValueError:
        kickoff = None

    state = ((comp.get("status") or {}).get("type") or {}).get("state", "pre")
    status_map = {"pre": "scheduled", "in": "live", "post": "finished"}

    def to_int(v):
        if v is None or v == "":
            return None
        try:
            return int(v)
        except (TypeError, ValueError):
            return None

    return {
        "espn_event_id": str(ev.get("id")),
        "home":          home,
        "away":          away,
        "home_score":    to_int(home_score),
        "away_score":    to_int(away_score),
        "kickoff":       kickoff,
        "status":        status_map.get(state, "scheduled"),
        "venue":         ((comp.get("venue") or {}).get("fullName")),
    }


def _next_match_no(db: Session, group_letter: str) -> int:
    last = (db.query(Fixture.match_no)
              .filter(Fixture.group_letter == group_letter)
              .order_by(Fixture.match_no.desc())
              .first())
    return (last[0] + 1) if (last and last[0]) else 1


def _upsert_group_fixture(db: Session, group_letter: str, p: dict) -> bool:
    """Insert or update one group-stage fixture. Returns True if changed."""
    # Match either by ESPN event id (preferred) or by team pair within the group.
    fx = None
    if p["espn_event_id"]:
        fx = (db.query(Fixture)
                .filter(Fixture.espn_event_id == p["espn_event_id"])
                .one_or_none())
    if fx is None:
        fx = (db.query(Fixture)
                .filter(Fixture.group_letter == group_letter,
                        Fixture.home_team_id == p["home"].id,
                        Fixture.away_team_id == p["away"].id)
                .one_or_none())
    if fx is None:
        fx = Fixture(
            group_letter=group_letter,
            match_no=_next_match_no(db, group_letter),
            home_team_id=p["home"].id,
            away_team_id=p["away"].id,
        )
        db.add(fx)
    fx.espn_event_id = p["espn_event_id"] or fx.espn_event_id
    if p["kickoff"]: fx.kickoff = p["kickoff"]
    if p["venue"]:   fx.venue   = p["venue"]
    fx.status = p["status"]
    if p["home_score"] is not None and p["away_score"] is not None:
        fx.home_score = p["home_score"]
        fx.away_score = p["away_score"]
    return True


def _upsert_knockout(db: Session, p: dict) -> bool:
    """Knockout match: locate next empty slot for this round and fill it."""
    # Round inference: this fetcher is conservative. Until ESPN tags rounds we
    # bucket all knockout games into 'r32' chronologically; when the front-end
    # bracket needs r16/qf/sf we can refine the rule.
    round_code = "r32"
    # Reuse existing record if we already saw this ESPN event.
    ko = None
    if p["espn_event_id"]:
        ko = (db.query(KnockoutMatch)
                .filter(KnockoutMatch.espn_event_id == p["espn_event_id"])
                .one_or_none())
    if ko is None:
        # First empty slot in the round (home_team_id IS NULL).
        ko = (db.query(KnockoutMatch)
                .filter(KnockoutMatch.round_code == round_code,
                        KnockoutMatch.home_team_id.is_(None))
                .order_by(KnockoutMatch.slot)
                .first())
        if ko is None:
            return False
    ko.home_team_id  = p["home"].id
    ko.away_team_id  = p["away"].id
    ko.espn_event_id = p["espn_event_id"] or ko.espn_event_id
    if p["kickoff"]: ko.kickoff = p["kickoff"]
    if p["venue"]:   ko.venue   = p["venue"]
    ko.status = p["status"]
    if p["home_score"] is not None and p["away_score"] is not None:
        ko.home_score = p["home_score"]
        ko.away_score = p["away_score"]
        if p["status"] == "finished":
            if p["home_score"] > p["away_score"]: ko.winner_team_id = p["home"].id
            elif p["away_score"] > p["home_score"]: ko.winner_team_id = p["away"].id
    return True


def _normalize_name(s: str) -> str:
    """Strip diacritics + case for fuzzy player matching."""
    nfkd = unicodedata.normalize("NFKD", s or "")
    return "".join(c for c in nfkd if not unicodedata.combining(c)).strip().upper()


def _is_goal_play(detail: dict) -> bool:
    """True if this play is a regular goal (penalty/header included, own goal excluded)."""
    if not detail.get("scoringPlay"):
        return False
    text = ((detail.get("type") or {}).get("text") or "")
    return "Goal" in text and "Own" not in text


def _collect_goals(events: list[dict]) -> tuple[list[tuple[str, str]], dict[str, str]]:
    """
    Walk every ESPN event and return:
      • [(espn_team_id, scorer_full_name), ...] for every regular goal,
      • {espn_team_id: our_team_code} mapping discovered from competitor blocks.
    """
    goals: list[tuple[str, str]] = []
    espn_team_to_code: dict[str, str] = {}

    for ev in events:
        comp = (ev.get("competitions") or [{}])[0]
        # Learn ESPN team id ↔ our code from this event's competitors.
        for c in comp.get("competitors") or []:
            team_block = c.get("team") or {}
            espn_id = str(team_block.get("id") or "")
            abbr    = team_block.get("abbreviation")
            if espn_id and abbr:
                espn_team_to_code[espn_id] = team_lookup_code(str(abbr))
        # Extract scorers.
        for d in comp.get("details") or []:
            if not _is_goal_play(d):
                continue
            athletes = d.get("athletesInvolved") or []
            if not athletes:
                continue
            scorer = athletes[0]
            scorer_name = scorer.get("fullName") or scorer.get("displayName") or ""
            espn_team_id = str(
                ((scorer.get("team") or {}).get("id"))
                or ((d.get("team") or {}).get("id") or "")
            )
            if scorer_name and espn_team_id:
                goals.append((espn_team_id, scorer_name))
    return goals, espn_team_to_code


def _apply_goal_counts(
    db: Session,
    goals: list[tuple[str, str]],
    espn_team_to_code: dict[str, str],
) -> dict:
    """
    Reset every player's wc_goals to 0, then bump it once per goal.
    Players are matched by (team, diacritic-insensitive name).
    """
    db.query(Player).update({Player.wc_goals: 0})

    # Build name index per team for fast matching.
    code_to_team: dict[str, Team] = {t.code: t for t in db.query(Team).all()}
    players_by_team: dict[int, list[Player]] = defaultdict(list)
    for p in db.query(Player).all():
        players_by_team[p.team_id].append(p)

    counts: dict[tuple[int, str], int] = defaultdict(int)
    unresolved_team   = 0
    unresolved_player = []
    for espn_team_id, scorer_name in goals:
        our_code = espn_team_to_code.get(espn_team_id)
        team     = code_to_team.get(our_code) if our_code else None
        if not team:
            unresolved_team += 1
            continue
        counts[(team.id, _normalize_name(scorer_name))] += 1

    applied = 0
    for (team_id, norm_name), n in counts.items():
        matched = False
        for p in players_by_team.get(team_id, []):
            if _normalize_name(p.name) == norm_name:
                p.wc_goals = n
                applied += n
                matched = True
                break
        if not matched:
            unresolved_player.append((team_id, norm_name, n))

    if unresolved_player:
        logger.info("goals: %d unresolved scorers: %s",
                    len(unresolved_player), unresolved_player[:10])
    return {
        "goals_seen":          len(goals),
        "goals_applied":       applied,
        "unresolved_team":     unresolved_team,
        "unresolved_player":   len(unresolved_player),
    }


def refresh_from_espn() -> dict:
    """Bootstrap structure if missing, then overlay ESPN events + goal scorers.

    Errors are caught per-stage and surfaced in the response dict (with the
    stage name and exception text) so /admin/refresh callers can see what
    broke without having to read container logs.
    """
    db = SessionLocal()
    summary: dict = {"events": 0, "group": 0, "knockout": 0,
                     "structure": {}, "scorers": {}, "errors": []}

    def _stage(name: str, fn):
        try:
            return fn()
        except Exception as e:
            db.rollback()
            logger.exception("ESPN refresh stage '%s' failed: %s", name, e)
            summary["errors"].append({"stage": name, "error": f"{type(e).__name__}: {e}"})
            return None

    try:
        summary["structure"] = _stage("ensure_structure", lambda: ensure_structure(db)) or {}

        events = _stage("fetch_events", _fetch_events) or []
        summary["events"] = len(events)
        if not events:
            return summary

        idx: dict[str, Team] = {t.code: t for t in db.query(Team).all()}
        idx.update({t.name.upper(): t for t in idx.values()})

        def _upsert_loop():
            for ev in events:
                p = _parse_event(ev, idx)
                if not p:
                    continue
                hg = TEAM_GROUP.get(p["home"].code)
                ag = TEAM_GROUP.get(p["away"].code)
                if hg and ag and hg == ag:
                    if _upsert_group_fixture(db, hg, p):
                        summary["group"] += 1
                else:
                    if _upsert_knockout(db, p):
                        summary["knockout"] += 1
        _stage("upsert_fixtures", _upsert_loop)

        def _score_loop():
            goals, espn_team_to_code = _collect_goals(events)
            summary["scorers"] = _apply_goal_counts(db, goals, espn_team_to_code)
        _stage("apply_goals", _score_loop)

        db.commit()
    finally:
        db.close()
    logger.info("ESPN refresh: %s", summary)
    return summary
