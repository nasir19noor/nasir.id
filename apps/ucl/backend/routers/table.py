from fastapi import APIRouter, Depends
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from database import get_db
from models import Fixture
from schemas import StandingRow, TableOut, TeamBase
from services.standings import league_table

router = APIRouter(prefix="/table", tags=["table"])


@router.get("", response_model=TableOut)
def get_table(db: Session = Depends(get_db)):
    rows = league_table(db)
    # Matchdays *played*, not scheduled: the full 8-matchday calendar is in the
    # database from the moment the draw is published, so counting every
    # matchday that exists would report 8 before a ball is kicked. A matchday
    # counts once all of its fixtures are finished.
    played = (db.query(Fixture.matchday)
                .filter(Fixture.round_code == "league",
                        Fixture.matchday.isnot(None))
                .group_by(Fixture.matchday)
                .having(func.count(Fixture.id) ==
                        func.sum(case((Fixture.status == "finished", 1), else_=0)))
                .count())
    return TableOut(
        standings=[
            StandingRow(
                position=r["position"],
                team=TeamBase.model_validate(r["team"]),
                played=r["played"], won=r["won"], drawn=r["drawn"], lost=r["lost"],
                gf=r["gf"], ga=r["ga"], gd=r["gd"], points=r["points"],
                zone=r["zone"],
            )
            for r in rows
        ],
        matchdays=int(played),
    )
