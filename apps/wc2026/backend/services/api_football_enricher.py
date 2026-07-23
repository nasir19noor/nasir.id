"""One-time enrichment of per-player tournament totals from API-Football
(https://www.api-football.com), covering metrics ESPN's summary endpoint
doesn't provide: tackles, interceptions, duels, dribbles, key passes, total
passes, fouls, minutes played, and average match rating.

Not part of the regular refresh cycle — the tournament is complete, this is a
one-shot backfill triggered via POST /admin/enrich-stats-af. The free tier is
rate-limited (~100 req/day), so the enrichment is resumable: each fixture is
matched to its API-Football id once (cached on Fixture.af_fixture_id) and
marked done (Fixture.af_stats_done) once its player stats are applied, so a
second day's run picks up exactly where the first left off.

Deliberately does NOT touch goals/assists/cards/shots/saves — those already
come from the ESPN enrichment (services/stats_enricher.py) and are left alone
here to avoid double-counting or drift between two sources.
"""
import os
import re
import logging
import unicodedata
import difflib

import requests
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Player, Team, Fixture

logger = logging.getLogger(__name__)

API_BASE = "https://v3.football.api-sports.io"
LEAGUE_ID = 1     # FIFA World Cup, per API-Football's /leagues catalogue
SEASON = 2026

# A handful of team names that commonly differ between API-Football's naming
# and this app's Team.name (from wc2026_data.TEAM_META). Extend this as any
# "unmatched_teams" show up in a real run's summary.
TEAM_NAME_ALIASES = {
    "USA": "UNITED STATES",
    "IR IRAN": "IRAN",
    "KOREA REPUBLIC": "SOUTH KOREA",
    "SOUTH KOREA REPUBLIC": "SOUTH KOREA",
    "COTE D'IVOIRE": "IVORY COAST",
    "CÔTE D'IVOIRE": "IVORY COAST",
    "DR CONGO": "DR CONGO",
    "CONGO DR": "DR CONGO",
    "CABO VERDE": "CAPE VERDE",
    "BOSNIA AND HERZEGOVINA": "BOSNIA AND HERZEGOVINA",
}


def _normalize(s: str) -> str:
    nfkd = unicodedata.normalize("NFKD", s or "")
    return "".join(c for c in nfkd if not unicodedata.combining(c)).strip().upper()


def _name_tokens(norm: str) -> set[str]:
    drop = {"JR", "JNR", "JUNIOR", "SR", "II", "III"}
    return {t for t in norm.replace(".", " ").split() if t and t not in drop}


def _match_team(af_name: str, teams: list[Team]) -> Team | None:
    norm = _normalize(af_name)
    norm = TEAM_NAME_ALIASES.get(norm, norm)
    for t in teams:
        if _normalize(t.name) == norm or _normalize(t.code) == norm:
            return t
    close = [t for t in teams
             if difflib.SequenceMatcher(None, norm, _normalize(t.name)).ratio() >= 0.82]
    return close[0] if len(close) == 1 else None


def _match_player(name: str, roster: list[Player]) -> Player | None:
    norm = _normalize(name)
    if not norm:
        return None
    exact = next((p for p in roster if _normalize(p.name) == norm), None)
    if exact:
        return exact
    tokens = _name_tokens(norm)
    if tokens:
        cands = [p for p in roster
                 if (pt := _name_tokens(_normalize(p.name))) and (pt <= tokens or tokens <= pt)]
        if len(cands) == 1:
            return cands[0]
    key = re.sub(r"[^A-Z0-9]", "", norm)
    if key:
        close = [p for p in roster
                 if difflib.SequenceMatcher(
                     None, key, re.sub(r"[^A-Z0-9]", "", _normalize(p.name))
                 ).ratio() >= 0.88]
        if len(close) == 1:
            return close[0]
    return None


def _get(url: str, session: requests.Session, headers: dict, params: dict | None = None) -> dict:
    r = session.get(url, headers=headers, params=params, timeout=25)
    r.raise_for_status()
    return r.json()


def enrich_from_api_football(max_requests: int = 90) -> dict:
    """Match every Fixture to its API-Football id (cheap, cached after the
    first run), then pull per-player stats for up to `max_requests` unfinished
    fixtures. Call again (e.g. the next day) to continue past the free-tier
    daily cap — already-done fixtures are skipped automatically.
    """
    api_key = os.getenv("API_FOOTBALL_KEY")
    summary = {
        "configured": bool(api_key), "requests_used": 0,
        "fixtures_total": 0, "fixtures_matched": 0, "fixtures_processed": 0,
        "fixtures_remaining": 0, "players_updated": 0,
        "unmatched_teams": [], "unmatched_players": [], "errors": [],
    }
    if not api_key:
        summary["errors"].append(
            "API_FOOTBALL_KEY is not set — sign up at https://dashboard.api-football.com/register "
            "(free tier) and set API_FOOTBALL_KEY in the environment.")
        return summary

    headers = {"x-apisports-key": api_key}
    session = requests.Session()

    db: Session = SessionLocal()
    try:
        fixtures = db.query(Fixture).all()
        summary["fixtures_total"] = len(fixtures)
        teams = db.query(Team).all()
        team_by_id = {t.id: t for t in teams}

        # ── Step 1: match every fixture to its API-Football id (once) ──
        unmatched = [f for f in fixtures if f.af_fixture_id is None]
        if unmatched:
            try:
                data = _get(f"{API_BASE}/fixtures", session, headers,
                            {"league": LEAGUE_ID, "season": SEASON})
                summary["requests_used"] += 1
                af_fixtures = data.get("response", []) or []
                unmatched_team_names: set[str] = set()

                # Index our fixtures by the unordered pair of team codes.
                by_pair: dict[frozenset, list[Fixture]] = {}
                for f in unmatched:
                    ht = team_by_id.get(f.home_team_id)
                    at = team_by_id.get(f.away_team_id)
                    if ht and at:
                        by_pair.setdefault(frozenset({ht.code, at.code}), []).append(f)

                for entry in af_fixtures:
                    teams_block = entry.get("teams") or {}
                    home_name = ((teams_block.get("home") or {}).get("name") or "")
                    away_name = ((teams_block.get("away") or {}).get("name") or "")
                    ht = _match_team(home_name, teams)
                    at = _match_team(away_name, teams)
                    if not ht:
                        unmatched_team_names.add(home_name)
                    if not at:
                        unmatched_team_names.add(away_name)
                    if not ht or not at:
                        continue
                    pair = frozenset({ht.code, at.code})
                    candidates = by_pair.get(pair)
                    if not candidates:
                        continue
                    fixture_id = ((entry.get("fixture") or {}).get("id"))
                    if fixture_id is None:
                        continue
                    # Round-robin groups can repeat a pair only across
                    # different rounds; with 1 candidate this is unambiguous.
                    target = candidates[0]
                    target.af_fixture_id = fixture_id
                    candidates.pop(0)
                    if not candidates:
                        del by_pair[pair]

                summary["unmatched_teams"] = sorted(unmatched_team_names)[:20]
                db.commit()
            except Exception as e:
                summary["errors"].append(f"fixture matching: {type(e).__name__}: {e}")

        summary["fixtures_matched"] = sum(1 for f in fixtures if f.af_fixture_id is not None)

        # ── Step 2: pull per-player stats for unfinished, matched fixtures ──
        todo = [f for f in fixtures if f.af_fixture_id is not None and not f.af_stats_done]
        players_by_team: dict[int, list[Player]] = {}
        for p in db.query(Player).all():
            players_by_team.setdefault(p.team_id, []).append(p)

        for f in todo:
            if summary["requests_used"] >= max_requests:
                break
            try:
                data = _get(f"{API_BASE}/fixtures/players", session, headers,
                            {"fixture": f.af_fixture_id})
                summary["requests_used"] += 1
            except Exception as e:
                summary["errors"].append(f"fixture {f.af_fixture_id}: {type(e).__name__}: {e}")
                continue

            for team_block in data.get("response", []) or []:
                af_team_name = ((team_block.get("team") or {}).get("name") or "")
                team = _match_team(af_team_name, teams)
                if not team:
                    continue
                roster = players_by_team.get(team.id, [])
                for pl in team_block.get("players", []) or []:
                    ath = pl.get("player") or {}
                    stat = (pl.get("statistics") or [{}])[0]
                    name = ath.get("name") or ""
                    p = _match_player(name, roster)
                    if p is None:
                        summary["unmatched_players"].append(f"{team.code}:{name}")
                        continue

                    games = stat.get("games") or {}
                    minutes = games.get("minutes") or 0
                    if minutes and minutes > 0:
                        p.appearances = (p.appearances or 0) + 1
                        p.minutes_played = (p.minutes_played or 0) + int(minutes)
                        rating = games.get("rating")
                        if rating:
                            try:
                                p.rating_sum = (p.rating_sum or 0) + float(rating)
                                p.rating_apps = (p.rating_apps or 0) + 1
                            except (TypeError, ValueError):
                                pass

                    tackles = stat.get("tackles") or {}
                    p.tackles = (p.tackles or 0) + int(tackles.get("total") or 0)
                    p.interceptions = (p.interceptions or 0) + int(tackles.get("interceptions") or 0)

                    duels = stat.get("duels") or {}
                    p.duels_won = (p.duels_won or 0) + int(duels.get("won") or 0)
                    p.duels_total = (p.duels_total or 0) + int(duels.get("total") or 0)

                    dribbles = stat.get("dribbles") or {}
                    p.dribbles_success = (p.dribbles_success or 0) + int(dribbles.get("success") or 0)
                    p.dribbles_attempts = (p.dribbles_attempts or 0) + int(dribbles.get("attempts") or 0)

                    passes = stat.get("passes") or {}
                    p.key_passes = (p.key_passes or 0) + int(passes.get("key") or 0)
                    p.passes_total = (p.passes_total or 0) + int(passes.get("total") or 0)

                    fouls = stat.get("fouls") or {}
                    p.fouls_committed = (p.fouls_committed or 0) + int(fouls.get("committed") or 0)
                    p.fouls_drawn = (p.fouls_drawn or 0) + int(fouls.get("drawn") or 0)

                    summary["players_updated"] += 1

            f.af_stats_done = True
            summary["fixtures_processed"] += 1
            db.commit()

        summary["fixtures_remaining"] = sum(
            1 for f in fixtures if f.af_fixture_id is not None and not f.af_stats_done)
        summary["unmatched_players"] = summary["unmatched_players"][:25]
    finally:
        db.close()

    logger.info("api_football enrichment: %s", {k: v for k, v in summary.items()
                                                 if k not in ("unmatched_players", "unmatched_teams")})
    return summary
