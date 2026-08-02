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
              .filter(Player.goals > 0)
              .order_by(Player.goals.desc(), Player.name)
              .limit(limit)
              .all())
    return [
        ScorerOut(rank=i, player=p.name, team=TeamBase.model_validate(t), goals=p.goals)
        for i, (p, t) in enumerate(rows, start=1)
    ]
