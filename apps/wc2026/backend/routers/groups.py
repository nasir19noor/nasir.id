from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Fixture, Team
from schemas import FixtureOut, GroupOut, StandingRow, TeamBase
from services.standings import standings_for_group

router = APIRouter(prefix="/groups", tags=["groups"])


def _fixture_out(f: Fixture) -> FixtureOut:
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
    )


def _group_out(db: Session, letter: str) -> GroupOut:
    standings_rows = standings_for_group(db, letter)
    standings = [
        StandingRow(
            team=TeamBase.model_validate(r["team"]),
            played=r["played"], won=r["won"], drawn=r["drawn"], lost=r["lost"],
            gf=r["gf"], ga=r["ga"], gd=r["gd"], points=r["points"],
        )
        for r in standings_rows
    ]
    fixtures = (db.query(Fixture)
                  .filter(Fixture.group_letter == letter)
                  .order_by(Fixture.match_no)
                  .all())
    return GroupOut(letter=letter, standings=standings,
                    fixtures=[_fixture_out(f) for f in fixtures])


@router.get("", response_model=list[GroupOut])
def list_groups(db: Session = Depends(get_db)):
    letters = [r[0] for r in db.query(Team.group_letter)
                                 .filter(Team.group_letter.isnot(None))
                                 .distinct().order_by(Team.group_letter).all()]
    return [_group_out(db, ltr) for ltr in letters]


@router.get("/{letter}", response_model=GroupOut)
def get_group(letter: str, db: Session = Depends(get_db)):
    letter = letter.upper()[:1]
    has_teams = db.query(Team).filter(Team.group_letter == letter).first()
    if not has_teams:
        raise HTTPException(404, f"Group {letter} not found")
    return _group_out(db, letter)
