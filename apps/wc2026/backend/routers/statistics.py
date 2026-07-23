"""Tournament statistics — per-player and per-match breakdowns.

Everything is aggregated from the database (final tournament data), so the
numbers stay consistent with the rest of the app. Scoped to this World Cup only
— career totals (caps, international goals) live on the Squads page instead,
not here.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Player, Team, Fixture, KnockoutMatch
from schemas import TeamBase

router = APIRouter(prefix="/statistics", tags=["statistics"])

KNOCKOUT_STAGES = [
    ("r32", "Round of 32"), ("r16", "Round of 16"), ("qf", "Quarter-finals"),
    ("sf", "Semi-finals"), ("third", "Third place"), ("final", "Final"),
]


def _team(t: Team | None) -> dict:
    return TeamBase.model_validate(t).model_dump() if t else {}


# ─── Player statistics ─────────────────────────────────────────────

@router.get("/players")
def player_statistics(db: Session = Depends(get_db)):
    teams_by_id = {t.id: t for t in db.query(Team).all()}
    players = db.query(Player).all()

    def row(p: Player) -> dict:
        return {
            "id": p.id,
            "name": p.name,
            "team": _team(teams_by_id.get(p.team_id)),
            "position": p.position,
            "age": p.age,
            "club": p.club,
            "goals": p.wc_goals or 0,
            "assists": p.assists or 0,
            "yellow_cards": p.yellow_cards or 0,
            "red_cards": p.red_cards or 0,
            "cards": (p.yellow_cards or 0) + (p.red_cards or 0),
            "shots": p.shots or 0,
            "shots_on_target": p.shots_on_target or 0,
            "saves": p.saves or 0,
            # API-Football enrichment (0 until /admin/enrich-stats-af has run).
            "appearances": p.appearances or 0,
            "minutes_played": p.minutes_played or 0,
            "avg_rating": (round(p.rating_sum / p.rating_apps, 2)
                          if p.rating_apps else None),
            "tackles": p.tackles or 0,
            "interceptions": p.interceptions or 0,
            "duels_won": p.duels_won or 0,
            "duels_total": p.duels_total or 0,
            "dribbles_success": p.dribbles_success or 0,
            "dribbles_attempts": p.dribbles_attempts or 0,
            "key_passes": p.key_passes or 0,
            "passes_total": p.passes_total or 0,
            "fouls_committed": p.fouls_committed or 0,
            "fouls_drawn": p.fouls_drawn or 0,
            "is_captain": p.is_captain,
        }

    ages = [p.age for p in players if p.age]
    by_pos: dict[str, int] = {}
    for p in players:
        by_pos[p.position or "?"] = by_pos.get(p.position or "?", 0) + 1

    def top(key, n=10, reverse=True, need=None):
        pool = [p for p in players if (need is None or getattr(p, need))]
        pool.sort(key=lambda p: (getattr(p, key) or 0), reverse=reverse)
        return [row(p) for p in pool[:n]]

    most_cards = sorted(
        (p for p in players if (p.yellow_cards or 0) + (p.red_cards or 0) > 0),
        key=lambda p: ((p.yellow_cards or 0) + (p.red_cards or 0), p.red_cards or 0),
        reverse=True,
    )[:10]

    # API-Football enrichment is optional (needs API_FOOTBALL_KEY + an admin
    # trigger) — af_enriched tells the frontend whether to render that section.
    af_enriched = any((p.appearances or 0) > 0 for p in players)
    # Ratings need a minimum sample so a single good cameo doesn't top the chart.
    rated = sorted(
        (p for p in players if p.rating_apps and p.appearances and p.appearances >= 3),
        key=lambda p: (p.rating_sum / p.rating_apps), reverse=True,
    )[:10]

    return {
        "summary": {
            "players": len(players),
            "goals": sum(p.wc_goals or 0 for p in players),
            "assists": sum(p.assists or 0 for p in players),
            "scorers": sum(1 for p in players if (p.wc_goals or 0) > 0),
            "yellow_cards": sum(p.yellow_cards or 0 for p in players),
            "red_cards": sum(p.red_cards or 0 for p in players),
            "avg_age": round(sum(ages) / len(ages), 1) if ages else 0,
            "positions": by_pos,
            "af_enriched": af_enriched,
        },
        "leaderboards": {
            "top_scorers":     top("wc_goals"),
            "top_assists":     top("assists"),
            "most_cards":      [row(p) for p in most_cards],
            "youngest":        top("age", reverse=False, need="age"),
            "most_tackles":    top("tackles"),
            "top_rating":      [row(p) for p in rated],
        },
        # Full list for a searchable/sortable table on the frontend.
        "players": [row(p) for p in sorted(players, key=lambda p: (-(p.wc_goals or 0), p.name))],
    }


# ─── Match statistics ──────────────────────────────────────────────

@router.get("/matches")
def match_statistics(db: Session = Depends(get_db)):
    teams_by_id = {t.id: t for t in db.query(Team).all()}

    finished = (db.query(Fixture)
                  .filter(Fixture.status == "finished",
                          Fixture.home_score.isnot(None),
                          Fixture.away_score.isnot(None))
                  .all())

    def match_row(f: Fixture) -> dict:
        total = (f.home_score or 0) + (f.away_score or 0)
        margin = abs((f.home_score or 0) - (f.away_score or 0))
        stage = f"Group {f.group_letter}" if f.group_letter else "Knockout"
        return {
            "home": _team(teams_by_id.get(f.home_team_id)),
            "away": _team(teams_by_id.get(f.away_team_id)),
            "home_score": f.home_score, "away_score": f.away_score,
            "total": total, "margin": margin, "stage": stage, "venue": f.venue,
        }

    rows = [match_row(f) for f in finished]
    goals = sum(r["total"] for r in rows)

    # Goals by stage: group from fixtures, each knockout round from KnockoutMatch.
    group_matches = [f for f in finished if f.group_letter]
    by_stage = [{
        "stage": "Group Stage",
        "matches": len(group_matches),
        "goals": sum((f.home_score or 0) + (f.away_score or 0) for f in group_matches),
    }]
    for code, label in KNOCKOUT_STAGES:
        kms = (db.query(KnockoutMatch)
                 .filter(KnockoutMatch.round_code == code,
                         KnockoutMatch.status == "finished",
                         KnockoutMatch.home_score.isnot(None),
                         KnockoutMatch.away_score.isnot(None))
                 .all())
        by_stage.append({
            "stage": label,
            "matches": len(kms),
            "goals": sum((k.home_score or 0) + (k.away_score or 0) for k in kms),
        })

    # Matches decided by a penalty shootout.
    shootouts = []
    for k in (db.query(KnockoutMatch)
                .filter(KnockoutMatch.home_shootout.isnot(None),
                        KnockoutMatch.away_shootout.isnot(None))
                .order_by(KnockoutMatch.kickoff).all()):
        label = dict(KNOCKOUT_STAGES).get(k.round_code, k.round_code)
        winner = teams_by_id.get(k.winner_team_id)
        shootouts.append({
            "home": _team(teams_by_id.get(k.home_team_id)),
            "away": _team(teams_by_id.get(k.away_team_id)),
            "score": f"{k.home_score}-{k.away_score}",
            "shootout": f"{k.home_shootout}-{k.away_shootout}",
            "winner": _team(winner) if winner else {},
            "stage": label,
        })

    return {
        "summary": {
            "matches": len(rows),
            "goals": goals,
            "goals_per_match": round(goals / len(rows), 2) if rows else 0.0,
            "shootouts": len(shootouts),
            "biggest_margin": max((r["margin"] for r in rows), default=0),
            "highest_scoring": max((r["total"] for r in rows), default=0),
            "draws": sum(1 for r in rows if r["margin"] == 0),
        },
        "goals_by_stage": by_stage,
        "highest_scoring": sorted(rows, key=lambda r: -r["total"])[:6],
        "biggest_wins": sorted(rows, key=lambda r: -r["margin"])[:6],
        "shootout_matches": shootouts,
    }
