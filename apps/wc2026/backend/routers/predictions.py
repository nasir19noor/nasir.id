from fastapi import APIRouter, HTTPException

from services.predictions import get_prediction

router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.get("/today")
def predictions_today():
    """Latest match-winner predictions (most recent generated day)."""
    p = get_prediction("match_winners")
    if not p:
        raise HTTPException(404, "No match predictions yet")
    return p


@router.get("/top-scorer")
def predictions_top_scorer():
    """Latest projected Golden Boot ranking."""
    p = get_prediction("top_scorer")
    if not p:
        raise HTTPException(404, "No top-scorer prediction yet")
    return p
