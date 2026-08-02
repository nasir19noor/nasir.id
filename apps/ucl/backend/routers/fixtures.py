from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Fixture
from schemas import FixtureOut, TeamBase

router = APIRouter(prefix="/fixtures", tags=["fixtures"])


def to_out(f: Fixture) -> FixtureOut:
    return FixtureOut(
        id=f.id,
        round_code=f.round_code,
        matchday=f.matchday,
        home=TeamBase.model_validate(f.home_team),
        away=TeamBase.model_validate(f.away_team),
        home_score=f.home_score,
        away_score=f.away_score,
        home_shootout=f.home_shootout,
        away_shootout=f.away_shootout,
        status=f.status,
        kickoff=f.kickoff,
        venue=f.venue,
    )


@router.get("", response_model=list[FixtureOut])
def list_fixtures(
    status:   str | None = Query(None, description="scheduled | live | finished"),
    round:    str | None = Query(None, description="league | playoff | r16 | qf | sf | final"),
    matchday: int | None = Query(None, ge=1, le=8),
    db: Session = Depends(get_db),
):
    q = db.query(Fixture)
    if status:
        q = q.filter(Fixture.status == status)
    if round:
        q = q.filter(Fixture.round_code == round)
    if matchday:
        q = q.filter(Fixture.matchday == matchday)
    q = q.order_by(Fixture.kickoff.is_(None), Fixture.kickoff, Fixture.id)
    return [to_out(f) for f in q.all()]


@router.get("/today", response_model=list[FixtureOut])
def fixtures_today(db: Session = Depends(get_db)):
    now   = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end   = start + timedelta(days=1)
    q = (db.query(Fixture)
           .filter(Fixture.kickoff >= start, Fixture.kickoff < end)
           .order_by(Fixture.kickoff))
    return [to_out(f) for f in q.all()]
