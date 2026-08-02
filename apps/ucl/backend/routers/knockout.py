"""Knockout rounds as two-legged ties.

UCL knockout matches are stored as plain fixtures tagged with their round;
this router groups each round's fixtures into ties by team pair, computes the
aggregate, and names the winner once the tie is decided. The final is a
single-leg "tie" and may carry a shootout score.
"""
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Fixture
from routers.fixtures import to_out
from schemas import RoundOut, TeamBase, TieOut

router = APIRouter(prefix="/knockout", tags=["knockout"])

ROUNDS = [
    ("playoff", "Knockout Phase Play-offs"),
    ("r16",     "Round of 16"),
    ("qf",      "Quarter-finals"),
    ("sf",      "Semi-finals"),
    ("final",   "Final"),
]


def _build_tie(legs: list[Fixture]) -> TieOut:
    legs = sorted(legs, key=lambda f: (f.kickoff is None, f.kickoff, f.id))
    # team_a = home side of leg 1, so "a" reads naturally as the first leg host.
    a, b = legs[0].home_team, legs[0].away_team

    def goals_for(team_id: int) -> int:
        total = 0
        for f in legs:
            if f.home_score is None or f.away_score is None:
                continue
            total += f.home_score if f.home_team_id == team_id else f.away_score
        return total

    played = [f for f in legs if f.status in ("live", "finished")
              and f.home_score is not None]
    agg_a = goals_for(a.id) if played else None
    agg_b = goals_for(b.id) if played else None

    # Decided once every scheduled leg has finished (two for a normal tie, one
    # for the final). Level aggregate → last leg's shootout decides.
    expected = 1 if legs[0].round_code == "final" else 2
    decided = len(legs) >= expected and all(f.status == "finished" for f in legs)
    winner = None
    if decided and agg_a is not None:
        if agg_a != agg_b:
            winner = a if agg_a > agg_b else b
        else:
            last = legs[-1]
            hso, aso = last.home_shootout, last.away_shootout
            if hso is not None and aso is not None and hso != aso:
                home_won = hso > aso
                winner = last.home_team if home_won else last.away_team

    return TieOut(
        team_a=TeamBase.model_validate(a),
        team_b=TeamBase.model_validate(b),
        legs=[to_out(f) for f in legs],
        agg_a=agg_a,
        agg_b=agg_b,
        winner=TeamBase.model_validate(winner) if winner else None,
        decided=decided,
    )


@router.get("", response_model=list[RoundOut])
def list_knockout(db: Session = Depends(get_db)):
    fixtures = (db.query(Fixture)
                  .filter(Fixture.round_code.in_([rc for rc, _ in ROUNDS]))
                  .all())
    by_round_pair: dict[str, dict[frozenset, list[Fixture]]] = defaultdict(lambda: defaultdict(list))
    for f in fixtures:
        pair = frozenset((f.home_team_id, f.away_team_id))
        by_round_pair[f.round_code][pair].append(f)

    out: list[RoundOut] = []
    for rc, label in ROUNDS:
        pairs = by_round_pair.get(rc)
        if not pairs:
            continue
        ties = [_build_tie(legs) for legs in pairs.values()]
        # Earliest kickoff first, so the round reads chronologically.
        ties.sort(key=lambda t: (t.legs[0].kickoff is None, t.legs[0].kickoff))
        out.append(RoundOut(round_code=rc, label=label, ties=ties))
    return out
