from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Player, Team
from schemas import PlayerOut, SquadOut, TeamBase

router = APIRouter(prefix="/squads", tags=["squads"])

POSITION_ORDER = {"GK": 1, "DF": 2, "MF": 3, "FW": 4}


@router.get("", response_model=list[TeamBase])
def list_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).order_by(Team.group_letter, Team.name).all()
    return [TeamBase.model_validate(t) for t in teams]


@router.get("/{team_code}", response_model=SquadOut)
def get_squad(team_code: str, db: Session = Depends(get_db)):
    team = (db.query(Team)
              .filter(Team.code == team_code.upper())
              .one_or_none())
    if team is None:
        raise HTTPException(404, f"Team {team_code} not found")
    players = (db.query(Player)
                 .filter(Player.team_id == team.id)
                 .all())
    players_sorted = sorted(
        players,
        key=lambda p: (POSITION_ORDER.get(p.position or "", 9),
                       p.jersey_number or 99),
    )
    return SquadOut(
        team=TeamBase.model_validate(team),
        players=[PlayerOut.model_validate(p) for p in players_sorted],
    )
