from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Fixture
from schemas import StandingRow, TableOut, TeamBase
from services.standings import league_table

router = APIRouter(prefix="/table", tags=["table"])


@router.get("", response_model=TableOut)
def get_table(db: Session = Depends(get_db)):
    rows = league_table(db)
    max_md = (db.query(func.max(Fixture.matchday))
                .filter(Fixture.round_code == "league")
                .scalar()) or 0
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
        matchdays=int(max_md),
    )
