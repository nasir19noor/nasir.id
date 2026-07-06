from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Fixture
from schemas import FixtureOut, TeamBase
from services.highlights import highlight_url, load_video_map

router = APIRouter(prefix="/fixtures", tags=["fixtures"])


def _to_out(f: Fixture, video_map: dict[str, str]) -> FixtureOut:
    return FixtureOut(
        id=f.id,
        group_letter=f.group_letter,
        match_no=f.match_no,
        home=TeamBase.model_validate(f.home_team),
        away=TeamBase.model_validate(f.away_team),
        home_score=f.home_score,
        away_score=f.away_score,
        status=f.status,
        kickoff=f.kickoff,
        venue=f.venue,
        highlight_url=highlight_url(f.home_team, f.away_team, video_map),
    )


@router.get("", response_model=list[FixtureOut])
def list_fixtures(
    status: str | None = Query(None, description="scheduled | live | finished"),
    group:  str | None = Query(None, description="A..L"),
    db: Session = Depends(get_db),
):
    q = db.query(Fixture)
    if status:
        q = q.filter(Fixture.status == status)
    if group:
        q = q.filter(Fixture.group_letter == group.upper())
    q = q.order_by(Fixture.kickoff.is_(None), Fixture.kickoff,
                   Fixture.group_letter, Fixture.match_no)
    video_map = load_video_map(db)
    return [_to_out(f, video_map) for f in q.all()]


@router.get("/today", response_model=list[FixtureOut])
def fixtures_today(db: Session = Depends(get_db)):
    now   = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end   = start + timedelta(days=1)
    q = (db.query(Fixture)
           .filter(Fixture.kickoff >= start, Fixture.kickoff < end)
           .order_by(Fixture.kickoff))
    video_map = load_video_map(db)
    return [_to_out(f, video_map) for f in q.all()]
