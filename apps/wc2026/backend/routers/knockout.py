from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import KnockoutMatch
from schemas import BracketOut, KnockoutOut, TeamBase
from services.highlights import highlight_url, load_video_map

router = APIRouter(prefix="/knockout", tags=["knockout"])

ROUND_ORDER = ["r32", "r16", "qf", "sf", "third", "final"]


def _to_out(m: KnockoutMatch, video_map: dict[str, str]) -> KnockoutOut:
    return KnockoutOut(
        id=m.id,
        round_code=m.round_code,
        slot=m.slot,
        home_label=m.home_label,
        away_label=m.away_label,
        home=TeamBase.model_validate(m.home_team) if m.home_team else None,
        away=TeamBase.model_validate(m.away_team) if m.away_team else None,
        home_score=m.home_score,
        away_score=m.away_score,
        home_shootout=m.home_shootout,
        away_shootout=m.away_shootout,
        winner=TeamBase.model_validate(m.winner_team) if m.winner_team else None,
        status=m.status,
        kickoff=m.kickoff,
        venue=m.venue,
        highlight_url=highlight_url(m.home_team, m.away_team, video_map),
    )


@router.get("", response_model=list[BracketOut])
def list_knockout(db: Session = Depends(get_db)):
    grouped: dict[str, list[KnockoutMatch]] = defaultdict(list)
    for m in (db.query(KnockoutMatch).order_by(KnockoutMatch.slot).all()):
        grouped[m.round_code].append(m)
    video_map = load_video_map(db)
    return [
        BracketOut(round_code=rc, matches=[_to_out(m, video_map) for m in grouped[rc]])
        for rc in ROUND_ORDER if grouped.get(rc)
    ]
