from fastapi import APIRouter, HTTPException, Query

from services.predictions import (
    get_prediction, get_today_match_predictions,
    get_match_history, get_overall_accuracy,
)

router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.get("/today")
def predictions_today():
    """Predictions for fixtures kicking off within the next window."""
    p = get_today_match_predictions()
    if not p:
        raise HTTPException(404, "No upcoming match predictions yet")
    return p


@router.get("/top-scorer")
def predictions_top_scorer():
    """Latest projected Golden Boot ranking."""
    p = get_prediction("top_scorer")
    if not p:
        raise HTTPException(404, "No top-scorer prediction yet")
    return p


@router.get("/champion")
def predictions_champion():
    """Latest projected tournament champion + contenders."""
    p = get_prediction("champion")
    if not p:
        raise HTTPException(404, "No champion prediction yet")
    return p


@router.get("/accuracy")
def predictions_accuracy():
    """Overall match-winner accuracy across all stored prediction days."""
    return get_overall_accuracy()


@router.get("/history")
def predictions_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
):
    """Paginated day-by-day match predictions evaluated against actual results."""
    return get_match_history(page=page, page_size=page_size)
