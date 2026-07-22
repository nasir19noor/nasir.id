"""Enrich player totals (assists, cards, shots, saves) from ESPN match summaries.

The scoreboard feed the app pulls hourly carries scores and goal scorers, but
not assists/cards. ESPN's per-match *summary* endpoint does — each team's roster
lists per-player goalAssists / yellowCards / redCards / totalShots /
shotsOnTarget / saves. This walks every played fixture's summary and sums those
onto the matching Player rows, using the same name-matching as goal attribution.

Run once (tournament is complete) via POST /admin/enrich-stats.
"""
import re
import logging
import difflib
from collections import defaultdict

import requests
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Player, Team, Fixture
from services.espn_fetcher import ESPN_URL, _normalize_name, _name_tokens
from services.wc2026_data import team_lookup_code

logger = logging.getLogger(__name__)

SUMMARY_URL = ESPN_URL.replace("/scoreboard", "/summary")

# ESPN roster stat name → Player column.
STAT_MAP = {
    "goalAssists":   "assists",
    "yellowCards":   "yellow_cards",
    "redCards":      "red_cards",
    "totalShots":    "shots",
    "shotsOnTarget": "shots_on_target",
    "saves":         "saves",
}


def _match_player(name: str, roster: list[Player]) -> Player | None:
    """Match an ESPN roster athlete to one of a team's Player rows."""
    norm = _normalize_name(name)
    if not norm:
        return None
    exact = next((p for p in roster if _normalize_name(p.name) == norm), None)
    if exact:
        return exact
    tokens = _name_tokens(norm)
    if tokens:
        cands = []
        for p in roster:
            pn = _name_tokens(_normalize_name(p.name))
            if pn and (pn <= tokens or tokens <= pn):
                cands.append(p)
        if len(cands) == 1:
            return cands[0]
    key = re.sub(r"[^A-Z0-9]", "", norm)
    if key:
        close = [p for p in roster
                 if difflib.SequenceMatcher(
                     None, key, re.sub(r"[^A-Z0-9]", "", _normalize_name(p.name))
                 ).ratio() >= 0.88]
        if len(close) == 1:
            return close[0]
    return None


def _to_int(v) -> int:
    try:
        return int(float(v)) if v not in (None, "") else 0
    except (TypeError, ValueError):
        return 0


def enrich_player_stats() -> dict:
    db: Session = SessionLocal()
    summary = {"events": 0, "matched": 0, "unmatched": 0,
               "unmatched_names": [], "errors": []}
    try:
        # Reset the enriched fields in-place, then accumulate.
        players = db.query(Player).all()
        for p in players:
            for col in STAT_MAP.values():
                setattr(p, col, 0)
        by_team: dict[int, list[Player]] = defaultdict(list)
        for p in players:
            by_team[p.team_id].append(p)
        code_to_team = {t.code: t for t in db.query(Team).all()}

        event_ids = [f.espn_event_id for f in
                     db.query(Fixture).filter(Fixture.espn_event_id.isnot(None)).all()]
        session = requests.Session()

        for eid in event_ids:
            try:
                r = session.get(SUMMARY_URL, params={"event": eid}, timeout=20)
                r.raise_for_status()
                data = r.json()
            except Exception as e:
                summary["errors"].append(f"{eid}: {type(e).__name__}")
                continue
            summary["events"] += 1

            for team_roster in data.get("rosters", []) or []:
                abbr = ((team_roster.get("team") or {}).get("abbreviation"))
                team = code_to_team.get(team_lookup_code(str(abbr))) if abbr else None
                if not team:
                    continue
                roster_players = by_team.get(team.id, [])
                for entry in team_roster.get("roster", []) or []:
                    stats = {s.get("name"): s.get("value")
                             for s in (entry.get("stats") or [])}
                    if not any(_to_int(stats.get(k)) for k in STAT_MAP):
                        continue  # nothing to attribute for this player
                    ath = entry.get("athlete") or {}
                    name = ath.get("displayName") or ath.get("shortName") or ""
                    p = _match_player(name, roster_players)
                    if p is None:
                        summary["unmatched"] += 1
                        summary["unmatched_names"].append(f"{team.code}:{name}")
                        continue
                    for espn_key, col in STAT_MAP.items():
                        setattr(p, col, (getattr(p, col) or 0) + _to_int(stats.get(espn_key)))
                    summary["matched"] += 1

        db.commit()
    finally:
        db.close()
    summary["unmatched_names"] = summary["unmatched_names"][:25]
    logger.info("enrich_player_stats: %s", {k: v for k, v in summary.items()
                                            if k != "unmatched_names"})
    return summary
