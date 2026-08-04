from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from models import Fixture, Player, Team
from routers.fixtures import to_out
from schemas import StandingRow, TeamBase, TeamDetail, TeamInfo, TeamScorer
from services.standings import league_table

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("", response_model=list[TeamInfo])
def list_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).order_by(Team.name).all()
    return [TeamInfo.model_validate(t) for t in teams]


@router.get("/{team_id}", response_model=TeamDetail)
def get_team(team_id: int, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).one_or_none()
    if team is None:
        raise HTTPException(404, "Team not found")

    standing = None
    for r in league_table(db):
        if r["team"].id == team.id:
            standing = StandingRow(
                position=r["position"],
                team=TeamBase.model_validate(r["team"]),
                played=r["played"], won=r["won"], drawn=r["drawn"], lost=r["lost"],
                gf=r["gf"], ga=r["ga"], gd=r["gd"], points=r["points"],
                zone=r["zone"],
            )
            break

    fixtures = (db.query(Fixture)
                  .filter(or_(Fixture.home_team_id == team.id,
                              Fixture.away_team_id == team.id))
                  .order_by(Fixture.kickoff.is_(None), Fixture.kickoff, Fixture.id)
                  .all())

    scorers = (db.query(Player)
                 .filter(Player.team_id == team.id, Player.goals > 0)
                 .order_by(Player.goals.desc(), Player.name)
                 .all())

    return TeamDetail(
        team=TeamInfo.model_validate(team),
        standing=standing,
        fixtures=[to_out(f) for f in fixtures],
        scorers=[TeamScorer(player=p.name, goals=p.goals) for p in scorers],
    )
