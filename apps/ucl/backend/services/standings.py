"""Compute the single 36-team league-phase table from played fixtures."""
from sqlalchemy.orm import Session
from models import Fixture, Team


def league_table(db: Session) -> list[dict]:
    """
    Rows of {team, played, won, drawn, lost, gf, ga, gd, points, zone},
    sorted by UEFA tiebreakers (Pts, GD, GF, name) and numbered 1..36.
    zone: direct (1-8) | playoff (9-24) | out (25-36).
    """
    # Only teams that appear in a league-phase fixture belong to the table —
    # knockout-only rows (never the case in practice) would distort it.
    fixtures = (db.query(Fixture)
                  .filter(Fixture.round_code == "league")
                  .all())
    team_ids = {f.home_team_id for f in fixtures} | {f.away_team_id for f in fixtures}
    teams = db.query(Team).filter(Team.id.in_(team_ids)).all() if team_ids else []

    rows: dict[int, dict] = {
        t.id: {"team": t, "played": 0, "won": 0, "drawn": 0, "lost": 0,
               "gf": 0, "ga": 0, "gd": 0, "points": 0}
        for t in teams
    }

    # Only count matches that actually kicked off — a "scheduled" fixture can
    # never contribute even if it carries a score.
    for f in fixtures:
        if f.status not in ("live", "finished") \
           or f.home_score is None or f.away_score is None:
            continue
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

    ordered = sorted(
        rows.values(),
        key=lambda r: (-r["points"], -r["gd"], -r["gf"], r["team"].name),
    )
    for i, r in enumerate(ordered, start=1):
        r["position"] = i
        r["zone"] = "direct" if i <= 8 else ("playoff" if i <= 24 else "out")
    return ordered
