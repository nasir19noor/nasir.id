from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Player, Team
from schemas import ScorerOut, TeamBase

router = APIRouter(prefix="/scorers", tags=["scorers"])


@router.get("", response_model=list[ScorerOut])
def top_scorers(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    rows = (db.query(Player, Team)
              .join(Team, Team.id == Player.team_id)
              .filter(Player.wc_goals > 0)
              .order_by(Player.wc_goals.desc(), Player.name)
              .limit(limit)
              .all())
    out: list[ScorerOut] = []
    for i, (p, t) in enumerate(rows, start=1):
        out.append(ScorerOut(
            rank=i,
            player=p.name + (" (C)" if p.is_captain else ""),
            team=TeamBase.model_validate(t),
            club=p.club,
            goals=p.wc_goals,
        ))
    return out
