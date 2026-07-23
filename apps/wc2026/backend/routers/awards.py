"""Post-tournament awards and statistics for the completed World Cup 2026.

Golden Boot is data-derived (leading scorer); the other named awards are the
final tournament honours. Player details and all statistics are read from the
database so they stay consistent with the rest of the app.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Player, Team, Fixture
from schemas import TeamBase

router = APIRouter(prefix="/awards", tags=["awards"])

# Final placings of the completed tournament.
FINAL = {"champion": "ESP", "runner_up": "ARG", "third": "ENG", "fourth": "FRA"}

# Individual honours (final results).
AWARDS = [
    {"award": "Golden Boot", "subtitle": "Top goalscorer", "emoji": "👟",
     "player": "Kylian Mbappé", "team": "FRA",
     "detail": "The tournament's leading scorer with 10 goals."},
    {"award": "Golden Ball", "subtitle": "Best player", "emoji": "⚽",
     "player": "Rodri", "team": "ESP",
     "detail": "The anchor of Spain's midfield throughout their title-winning run."},
    {"award": "Golden Glove", "subtitle": "Best goalkeeper", "emoji": "🧤",
     "player": "Unai Simón", "team": "ESP",
     "detail": "The champions' goalkeeper, anchoring Spain's run to the title."},
    {"award": "Best Young Player", "subtitle": "Best player aged 21 or under",
     "emoji": "🌟", "player": "Pau Cubarsí", "team": "ESP",
     "detail": "Just 19 years old and a rock at the heart of Spain's defence."},
]

# Team honours (no individual player attached).
TEAM_AWARDS = [
    {"award": "Fair Play Award", "subtitle": "Best disciplinary record", "emoji": "🤝",
     "team": "NED"},
]


def _team_dict(t: Team | None, code: str = "") -> dict:
    return TeamBase.model_validate(t).model_dump() if t else {"code": code}


@router.get("")
def get_awards(db: Session = Depends(get_db)):
    teams_by_code = {t.code: t for t in db.query(Team).all()}
    teams_by_id = {t.id: t for t in teams_by_code.values()}

    # ── Individual awards, enriched from squad data ──
    enriched_awards = []
    for a in AWARDS:
        info = dict(a)
        info["team"] = _team_dict(teams_by_code.get(a["team"]), a["team"])
        p = (db.query(Player)
               .join(Team, Team.id == Player.team_id)
               .filter(Team.code == a["team"], Player.name == a["player"])
               .one_or_none())
        if p is not None:
            info.update(club=p.club, position=p.position, age=p.age,
                        goals=p.wc_goals, is_captain=p.is_captain)
        enriched_awards.append(info)

    # ── Team awards, enriched with the team's actual discipline record ──
    enriched_team_awards = []
    for a in TEAM_AWARDS:
        info = dict(a)
        team = teams_by_code.get(a["team"])
        info["team"] = _team_dict(team, a["team"])
        if team is not None:
            yellow = sum(p.yellow_cards or 0 for p in team.players)
            red = sum(p.red_cards or 0 for p in team.players)
            played = (db.query(Fixture)
                        .filter(Fixture.status == "finished",
                               (Fixture.home_team_id == team.id) |
                               (Fixture.away_team_id == team.id))
                        .count())
            info["detail"] = (f"{team.name} picked up just {yellow} yellow card"
                              f"{'s' if yellow != 1 else ''} and {red} red card"
                              f"{'s' if red != 1 else ''} in {played} matches.")
        enriched_team_awards.append(info)

    # ── Final standings ──
    standings = {k: _team_dict(teams_by_code.get(code), code)
                 for k, code in FINAL.items()}

    # ── Tournament statistics (Fixture rows cover all 104 matches) ──
    finished = (db.query(Fixture)
                  .filter(Fixture.status == "finished",
                          Fixture.home_score.isnot(None),
                          Fixture.away_score.isnot(None))
                  .all())
    matches = len(finished)
    goals = sum((f.home_score or 0) + (f.away_score or 0) for f in finished)
    scorers = int(db.query(func.count(Player.id))
                    .filter(Player.wc_goals > 0).scalar() or 0)

    # goals-for per team, across every match
    team_goals: dict[int, int] = {}
    for f in finished:
        if f.home_team_id:
            team_goals[f.home_team_id] = team_goals.get(f.home_team_id, 0) + (f.home_score or 0)
        if f.away_team_id:
            team_goals[f.away_team_id] = team_goals.get(f.away_team_id, 0) + (f.away_score or 0)
    top_scoring_teams = [
        {"team": _team_dict(teams_by_id[tid]), "goals": g}
        for tid, g in sorted(team_goals.items(), key=lambda kv: -kv[1])[:8]
        if tid in teams_by_id
    ]

    # ── Golden Boot race ──
    scorer_rows = (db.query(Player, Team)
                     .join(Team, Team.id == Player.team_id)
                     .filter(Player.wc_goals > 0)
                     .order_by(Player.wc_goals.desc(), Player.name)
                     .limit(15).all())
    top_scorers = [{
        "rank": i,
        "player": p.name + (" (C)" if p.is_captain else ""),
        "team": TeamBase.model_validate(t).model_dump(),
        "club": p.club, "goals": p.wc_goals,
    } for i, (p, t) in enumerate(scorer_rows, start=1)]

    return {
        "champion": standings["champion"],
        "team_awards": enriched_team_awards,
        "standings": standings,
        "awards": enriched_awards,
        "stats": {
            "matches": matches,
            "goals": goals,
            "goals_per_match": round(goals / matches, 2) if matches else 0.0,
            "teams": int(db.query(func.count(Team.id)).scalar() or 0),
            "players": int(db.query(func.count(Player.id)).scalar() or 0),
            "scorers": scorers,
            "biggest_margin": max((abs((f.home_score or 0) - (f.away_score or 0))
                                   for f in finished), default=0),
            "highest_scoring": max(((f.home_score or 0) + (f.away_score or 0)
                                    for f in finished), default=0),
        },
        "top_scorers": top_scorers,
        "top_scoring_teams": top_scoring_teams,
    }
