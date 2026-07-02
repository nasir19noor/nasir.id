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
import re
import difflib
import logging
import unicodedata
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

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
# Back far enough to always cover the whole tournament (group stage → final is
# ~38 days), so cumulative scorer totals never lose early-tournament goals when
# _apply_goal_counts resets and re-applies from the fetched window.
ESPN_BACK_DAYS    = int(os.getenv("ESPN_BACK_DAYS",    "45"))
ESPN_FORWARD_DAYS = int(os.getenv("ESPN_FORWARD_DAYS", "40"))
# ESPN's scoreboard returns at most ~100 events per request, so we fetch the
# window in chunks and merge (the tournament has 104 matches).
ESPN_CHUNK_DAYS   = int(os.getenv("ESPN_CHUNK_DAYS",   "15"))
# Fixed tournament window (preferred over the rolling window so we ALWAYS cover
# the full event regardless of the server's current date). WC 2026: 11 Jun–19 Jul.
ESPN_START_DATE   = os.getenv("ESPN_START_DATE", "2026-06-11")
ESPN_END_DATE     = os.getenv("ESPN_END_DATE",   "2026-07-19")


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

def _fetch_window() -> tuple[date, date]:
    """The date range to fetch. Prefer the fixed tournament window
    (ESPN_START_DATE..ESPN_END_DATE) so we always cover the whole event; fall
    back to a rolling window around today if those aren't set/parseable. A ±1-day
    buffer guards against timezone edges on the first/last match days."""
    if ESPN_START_DATE and ESPN_END_DATE:
        try:
            s = date.fromisoformat(ESPN_START_DATE) - timedelta(days=1)
            e = date.fromisoformat(ESPN_END_DATE) + timedelta(days=1)
            return s, e
        except ValueError:
            logger.warning("Invalid ESPN_START_DATE/ESPN_END_DATE; using rolling window")
    today = datetime.now(timezone.utc).date()
    return today - timedelta(days=ESPN_BACK_DAYS), today + timedelta(days=ESPN_FORWARD_DAYS)


def _fetch_events() -> list[dict]:
    """Fetch all events across the tournament window, in chunks (ESPN caps a
    single request at ~100 events), merged and de-duplicated by event id."""
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
                               "consider a smaller ESPN_CHUNK_DAYS", params["dates"])
        except Exception as e:
            logger.warning("ESPN fetch failed for %s: %s", params["dates"], e)
        cur = chunk_end + timedelta(days=1)

    logger.info("ESPN fetch: %d events across %s..%s",
                len(events_by_id), start, end)
    return list(events_by_id.values())


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
    home_so = away_so = None
    for c in comp.get("competitors") or []:
        team = _resolve_team(idx, c)
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
        "home_shootout": to_int(home_so),
        "away_shootout": to_int(away_so),
        "kickoff":       kickoff,
        "status":        status_map.get(state, "scheduled"),
        "venue":         ((comp.get("venue") or {}).get("fullName")),
    }


def _seed_match_counters(db: Session) -> dict[str, int]:
    """Highest match_no currently in use per group letter — counter seed."""
    counters: dict[str, int] = {}
    rows = (db.query(Fixture.group_letter, Fixture.match_no)
              .filter(Fixture.match_no.isnot(None))
              .all())
    for letter, n in rows:
        if letter and (n is not None) and n > counters.get(letter, 0):
            counters[letter] = n
    return counters


def _upsert_fixture(
    db: Session,
    group_letter: str | None,
    p: dict,
    match_counters: dict[str, int],
) -> bool:
    """Insert or update one fixture. Returns True if changed.

    `group_letter=None` marks a knockout match — it is still stored as a
    Fixture (in addition to the bracket) so /fixtures/today and the AI
    predictions include knockout games, not just the group stage.

    `match_counters` holds the highest match_no in use per group. We
    increment it locally before each new insert because the DB-side max
    would otherwise miss rows we just added inside this transaction (they
    aren't visible until the next flush) — causing a uniqueness collision.
    """
    fx = None
    if p["espn_event_id"]:
        fx = (db.query(Fixture)
                .filter(Fixture.espn_event_id == p["espn_event_id"])
                .one_or_none())
    if fx is None and group_letter:
        # Match the team pair within the group — order-insensitive so the
        # round-robin's reverse fixture isn't treated as a new row.
        fx = (db.query(Fixture)
                .filter(Fixture.group_letter == group_letter)
                .filter(
                    ((Fixture.home_team_id == p["home"].id) & (Fixture.away_team_id == p["away"].id))
                    | ((Fixture.home_team_id == p["away"].id) & (Fixture.away_team_id == p["home"].id))
                )
                .one_or_none())
    if fx is None:
        match_no = None
        if group_letter:  # match_no is a within-group number; knockout has none
            match_counters[group_letter] = match_counters.get(group_letter, 0) + 1
            match_no = match_counters[group_letter]
        fx = Fixture(
            group_letter=group_letter,
            match_no=match_no,
            home_team_id=p["home"].id,
            away_team_id=p["away"].id,
        )
        db.add(fx)
        db.flush()                  # surface DB errors per-row, not per-batch
    fx.espn_event_id = p["espn_event_id"] or fx.espn_event_id
    if p["kickoff"]: fx.kickoff = p["kickoff"]
    if p["venue"]:   fx.venue   = p["venue"]
    fx.status = p["status"]
    # ESPN reports score "0" for matches that haven't kicked off. Only treat
    # scores as real once the match is live or finished — otherwise clear
    # them so standings don't count unplayed games as 0-0 draws.
    if p["status"] in ("live", "finished") \
       and p["home_score"] is not None and p["away_score"] is not None:
        fx.home_score = p["home_score"]
        fx.away_score = p["away_score"]
    else:
        fx.home_score = None
        fx.away_score = None
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
    if p["status"] in ("live", "finished") \
       and p["home_score"] is not None and p["away_score"] is not None:
        ko.home_score = p["home_score"]
        ko.away_score = p["away_score"]
        ko.home_shootout = p.get("home_shootout")
        ko.away_shootout = p.get("away_shootout")
        if p["status"] == "finished":
            if   p["home_score"] > p["away_score"]: ko.winner_team_id = p["home"].id
            elif p["away_score"] > p["home_score"]: ko.winner_team_id = p["away"].id
            else:
                # Level in regulation → decided on penalties. Use the shootout score.
                hso, aso = p.get("home_shootout"), p.get("away_shootout")
                if hso is not None and aso is not None and hso != aso:
                    ko.winner_team_id = p["home"].id if hso > aso else p["away"].id
    else:
        ko.home_score = None
        ko.away_score = None
        ko.home_shootout = None
        ko.away_shootout = None
    return True


def _normalize_name(s: str) -> str:
    """Strip diacritics + case for fuzzy player matching."""
    nfkd = unicodedata.normalize("NFKD", s or "")
    return "".join(c for c in nfkd if not unicodedata.combining(c)).strip().upper()


def _name_tokens(norm: str) -> set[str]:
    """Word tokens of a normalized name, dropping common suffixes/initials noise."""
    drop = {"JR", "JNR", "JUNIOR", "SR", "II", "III"}
    return {t for t in norm.replace(".", " ").split() if t and t not in drop}


SHOOTOUT_CLOCK = 7200.0  # 120' — ESPN stamps every shootout kick at this clock


def _is_goal_play(detail: dict, match_has_shootout: bool = False) -> bool:
    """True if this play counts as a tournament goal.

    Includes open-play goals, headers, free-kicks, volleys, and IN-GAME
    penalties. Excludes own goals and PENALTY-SHOOTOUT kicks. ESPN types both
    in-game and shootout penalties as 'Penalty - Scored', but shootout kicks are
    all stamped at 120' (clock 7200s) while in-game penalties carry their real
    minute — so we count a penalty only when it occurred before the 120' mark.
    """
    if not detail.get("scoringPlay"):
        return False
    text = ((detail.get("type") or {}).get("text") or "")
    if "Own" in text:
        return False
    if "Goal" in text:
        return True
    if "Penalty - Scored" in text:
        if not match_has_shootout:
            return True  # no shootout in this match → it's an in-game penalty goal
        # In a shootout match, exclude the kicks (stamped at 120'); keep any
        # penalty scored earlier in regulation/extra time.
        clock = (detail.get("clock") or {}).get("value")
        return clock is not None and clock < SHOOTOUT_CLOCK
    return False


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
        competitors = comp.get("competitors") or []
        has_shootout = any(c.get("shootoutScore") not in (None, "") for c in competitors)
        # Learn ESPN team id ↔ our code from this event's competitors.
        for c in competitors:
            team_block = c.get("team") or {}
            espn_id = str(team_block.get("id") or "")
            abbr    = team_block.get("abbreviation")
            if espn_id and abbr:
                espn_team_to_code[espn_id] = team_lookup_code(str(abbr))
        # Extract scorers.
        for d in comp.get("details") or []:
            if not _is_goal_play(d, has_shootout):
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
    orig_name: dict[tuple[int, str], str] = {}   # keep the original name for reporting
    unresolved_team   = 0
    unresolved_player = []
    for espn_team_id, scorer_name in goals:
        our_code = espn_team_to_code.get(espn_team_id)
        team     = code_to_team.get(our_code) if our_code else None
        if not team:
            unresolved_team += 1
            continue
        norm = _normalize_name(scorer_name)
        counts[(team.id, norm)] += 1
        orig_name[(team.id, norm)] = scorer_name

    applied = 0
    for (team_id, norm_name), n in counts.items():
        roster = players_by_team.get(team_id, [])
        # 1) exact normalized match
        match = next((p for p in roster if _normalize_name(p.name) == norm_name), None)
        # 2) fallback: token-subset match (handles extra/missing name parts like
        #    "Kylian Mbappé Lottin" vs "Kylian Mbappé"), accepted only when it
        #    resolves to exactly ONE roster player (avoids mis-attribution).
        if match is None:
            en = _name_tokens(norm_name)
            if en:
                cands = []
                for p in roster:
                    pn = _name_tokens(_normalize_name(p.name))
                    if pn and (pn <= en or en <= pn):
                        cands.append(p)
                if len(cands) == 1:
                    match = cands[0]
        # 3) fallback: fuzzy match for transliteration variants (e.g. ESPN
        #    "Mousa Al-Tamari" vs squad "Musa Al-Taamari"). High threshold +
        #    unique-candidate guard so we never mis-credit a similar teammate.
        if match is None:
            key = re.sub(r"[^A-Z0-9]", "", norm_name)
            if key:
                close = [p for p in roster
                         if difflib.SequenceMatcher(
                             None, key,
                             re.sub(r"[^A-Z0-9]", "", _normalize_name(p.name))
                         ).ratio() >= 0.88]
                if len(close) == 1:
                    match = close[0]
        if match is not None:
            match.wc_goals = n
            applied += n
        else:
            unresolved_player.append({
                "team_id": team_id,
                "scorer": orig_name[(team_id, norm_name)],
                "goals": n,
            })

    if unresolved_player:
        logger.info("goals: %d unresolved scorers: %s",
                    len(unresolved_player), unresolved_player[:10])
    return {
        "goals_seen":          len(goals),
        "goals_applied":       applied,
        "unresolved_team":     unresolved_team,
        "unresolved_player":   len(unresolved_player),
        # Names of scorers whose goals couldn't be matched to a squad player —
        # these are the goals missing from /scorers. Fix the squad entry or alias.
        "unresolved_scorers":  [u["scorer"] for u in unresolved_player],
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
        match_counters = _seed_match_counters(db)

        def _upsert_loop():
            for ev in events:
                p = _parse_event(ev, idx)
                if not p:
                    continue
                hg = TEAM_GROUP.get(p["home"].code)
                ag = TEAM_GROUP.get(p["away"].code)
                if hg and ag and hg == ag:
                    if _upsert_fixture(db, hg, p, match_counters):
                        summary["group"] += 1
                else:
                    if _upsert_knockout(db, p):
                        summary["knockout"] += 1
                    # Also store the knockout match as a Fixture so it shows up
                    # in "today's fixtures" and the AI match predictions.
                    _upsert_fixture(db, None, p, match_counters)
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
