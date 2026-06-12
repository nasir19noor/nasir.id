"""Compute group standings from played fixtures."""
from collections import defaultdict
from sqlalchemy.orm import Session
from models import Fixture, Team


def standings_for_group(db: Session, group_letter: str) -> list[dict]:
    """
    Return rows of {team, played, won, drawn, lost, gf, ga, gd, points},
    sorted by FIFA tiebreakers (Pts, GD, GF, name).
    """
    teams = (db.query(Team)
               .filter(Team.group_letter == group_letter)
               .all())
    rows: dict[int, dict] = {
        t.id: {"team": t, "played": 0, "won": 0, "drawn": 0, "lost": 0,
               "gf": 0, "ga": 0, "gd": 0, "points": 0}
        for t in teams
    }

    fixtures = (db.query(Fixture)
                  .filter(Fixture.group_letter == group_letter,
                          Fixture.home_score.isnot(None),
                          Fixture.away_score.isnot(None))
                  .all())
    for f in fixtures:
        h, a = rows.get(f.home_team_id), rows.get(f.away_team_id)
        if not h or not a:
            continue
        hs, as_ = int(f.home_score), int(f.away_score)
        h["played"] += 1; a["played"] += 1
        h["gf"] += hs;    h["ga"] += as_
        a["gf"] += as_;   a["ga"] += hs
        if hs > as_:
            h["won"]  += 1; h["points"] += 3
            a["lost"] += 1
        elif hs < as_:
            a["won"]  += 1; a["points"] += 3
            h["lost"] += 1
        else:
            h["drawn"] += 1; a["drawn"] += 1
            h["points"] += 1; a["points"] += 1

    for r in rows.values():
        r["gd"] = r["gf"] - r["ga"]

    return sorted(
        rows.values(),
        key=lambda r: (-r["points"], -r["gd"], -r["gf"], r["team"].name),
    )
