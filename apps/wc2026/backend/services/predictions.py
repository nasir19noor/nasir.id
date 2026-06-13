"""
AI predictions via the Claude API.

Two artifacts are produced once a day (and on demand):
  • match_winners — winner + score-line probabilities for today's fixtures
  • top_scorer    — projected Golden Boot ranking

Design notes (per Anthropic SDK guidance):
  • client.messages.parse() with Pydantic schemas → guaranteed-shape JSON.
  • Adaptive thinking + medium effort — this is a reasoning task, not latency-
    sensitive, and runs on a schedule.
  • Prompt caching: the methodology + static reference table (FIFA rank, GDP)
    is a stable system prefix with a cache_control breakpoint, reused across
    both calls in a run and across days. Per-day volatile data (fixtures,
    standings, scorer candidates) goes in the user message, after the cache
    breakpoint, so it never invalidates the cached prefix.
"""
import os
import json
import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Optional

from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Fixture, Player, Team, Prediction
from services.standings import standings_for_group
from services.wc2026_data import TEAM_FACTS, TEAM_GROUP, team_fact

logger = logging.getLogger(__name__)

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

MODEL = os.getenv("PREDICTION_MODEL", "claude-opus-4-8")
WIB   = timezone(timedelta(hours=7))
# Predict every scheduled fixture kicking off within this many hours from now.
PREDICTION_WINDOW_HOURS = int(os.getenv("PREDICTION_WINDOW_HOURS", "24"))


# ─── Pydantic output schemas (structured outputs) ──────────────────

class MatchPrediction(BaseModel):
    fixture_id:       int
    home:             str   # team code
    away:             str   # team code
    predicted_winner: str   # home code, away code, or "draw"
    home_win_pct:     int
    draw_pct:         int
    away_win_pct:     int
    likely_score:     str   # e.g. "2-1"
    confidence:       str   # low | medium | high
    reasoning:        str


class MatchPredictions(BaseModel):
    predictions: list[MatchPrediction]


class ScorerPrediction(BaseModel):
    rank:                  int
    player:                str
    team:                  str   # team code
    current_goals:         int
    projected_final_goals: int
    reasoning:             str


class TopScorerForecast(BaseModel):
    ranking: list[ScorerPrediction]
    summary: str


# ─── Cached system prefix ──────────────────────────────────────────

def _reference_table() -> str:
    """Static FIFA-rank + GDP table — the cacheable reference block."""
    lines = ["code | fifa_rank | gdp_usd_billion"]
    for code in sorted(TEAM_FACTS):
        rank, gdp = TEAM_FACTS[code]
        lines.append(f"{code} | {rank} | {gdp}")
    return "\n".join(lines)


SYSTEM_METHODOLOGY = """You are a football analyst predicting outcomes for the FIFA World Cup 2026.

You weigh multiple signals to reason about each prediction:
- FIFA ranking (lower is stronger) and recent tournament form (group standings so far).
- Squad quality: caps, international goals, club level of key players.
- Match context: the venue/stadium, whether a side is at home (USA/Canada/Mexico co-host), and group situation (who needs points).
- Soft signals: a country's GDP loosely correlates with footballing infrastructure but is a weak predictor — use it only as a minor tiebreaker, never override on-pitch evidence with it.

Rules:
- Probabilities for a match (home_win_pct, draw_pct, away_win_pct) MUST sum to 100.
- Be calibrated: a strong favourite vs a weak side might be 70/20/10, an even tie 40/30/30. Avoid overconfidence.
- predicted_winner is the team code with the highest win probability, or "draw" if a draw is most likely.
- Keep each reasoning to 1-2 concise sentences citing the decisive factors.
- Never invent players, scores, or fixtures not present in the provided data.

Static reference table (FIFA ranking position and nominal GDP in USD billions; reference inputs only, not authoritative):
"""


def _client():
    key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set")
    if not ANTHROPIC_AVAILABLE:
        raise RuntimeError("anthropic package not installed")
    return anthropic.Anthropic(api_key=key)


def _system_blocks() -> list[dict]:
    """System prompt as a single cached block (methodology + reference table)."""
    return [{
        "type": "text",
        "text": SYSTEM_METHODOLOGY + _reference_table(),
        "cache_control": {"type": "ephemeral"},
    }]


# ─── Context gathering ─────────────────────────────────────────────

def _standing_for(db: Session, team_id: int, group_letter: str | None) -> dict:
    if not group_letter:
        return {}
    for r in standings_for_group(db, group_letter):
        if r["team"].id == team_id:
            return {"played": r["played"], "won": r["won"], "drawn": r["drawn"],
                    "lost": r["lost"], "gf": r["gf"], "ga": r["ga"],
                    "gd": r["gd"], "points": r["points"]}
    return {}


def _key_players(db: Session, team_id: int, limit: int = 5) -> list[dict]:
    players = (db.query(Player)
                 .filter(Player.team_id == team_id)
                 .order_by(Player.intl_goals.desc())
                 .limit(limit).all())
    return [{"name": p.name, "pos": p.position, "club": p.club,
             "caps": p.caps, "intl_goals": p.intl_goals, "wc_goals": p.wc_goals}
            for p in players]


def _upcoming_fixtures(db: Session) -> list[Fixture]:
    """
    Scheduled fixtures kicking off within the next PREDICTION_WINDOW_HOURS.

    A rolling forward window (rather than a WIB/UTC calendar day) is
    timezone-robust: a North-American evening match day spills past WIB
    midnight, so a calendar window would drop the very games a WIB viewer
    is about to watch. The 6-hourly run keeps this list fresh as games
    finish and drop off the front.
    """
    now = datetime.now(timezone.utc)
    end = now + timedelta(hours=PREDICTION_WINDOW_HOURS)
    return (db.query(Fixture)
              .filter(Fixture.kickoff.isnot(None),
                      Fixture.kickoff >= now - timedelta(hours=1),
                      Fixture.kickoff <= end,
                      Fixture.status == "scheduled")
              .order_by(Fixture.kickoff).all())


def _run_date() -> str:
    """Storage/label key for a run: the WIB date it was generated."""
    return datetime.now(WIB).strftime("%Y-%m-%d")


def _match_context(db: Session) -> tuple[list[dict], str]:
    fixtures = _upcoming_fixtures(db)
    date_str = _run_date()
    out = []
    for f in fixtures:
        if not f.home_team or not f.away_team:
            continue
        h, a = f.home_team, f.away_team
        out.append({
            "fixture_id": f.id,
            "group": f.group_letter,
            "venue": f.venue,
            "kickoff_utc": f.kickoff.isoformat() if f.kickoff else None,
            "home": {"code": h.code, "name": h.name, **team_fact(h.code),
                     "standing": _standing_for(db, h.id, f.group_letter),
                     "key_players": _key_players(db, h.id)},
            "away": {"code": a.code, "name": a.name, **team_fact(a.code),
                     "standing": _standing_for(db, a.id, f.group_letter),
                     "key_players": _key_players(db, a.id)},
        })
    return out, date_str


def _scorer_candidates(db: Session, limit: int = 25) -> list[dict]:
    # Current scorers first, then notable forwards by career intl goals.
    rows = (db.query(Player, Team)
              .join(Team, Team.id == Player.team_id)
              .order_by(Player.wc_goals.desc(), Player.intl_goals.desc())
              .limit(limit).all())
    out = []
    for p, t in rows:
        out.append({
            "player": p.name, "team": t.code, "pos": p.position,
            "club": p.club, "caps": p.caps, "intl_goals": p.intl_goals,
            "wc_goals": p.wc_goals, "group": TEAM_GROUP.get(t.code),
        })
    return out


# ─── Prediction calls ──────────────────────────────────────────────

def _persist(db: Session, date_str: str, kind: str, payload: dict,
             cache_read: int) -> None:
    existing = (db.query(Prediction)
                  .filter(Prediction.prediction_date == date_str,
                          Prediction.kind == kind).one_or_none())
    if existing is None:
        existing = Prediction(prediction_date=date_str, kind=kind)
        db.add(existing)
    existing.payload      = json.dumps(payload, ensure_ascii=False)
    existing.model        = MODEL
    existing.cache_read   = cache_read
    existing.generated_at = datetime.now(timezone.utc)
    db.commit()


def predict_match_winners() -> dict:
    db = SessionLocal()
    try:
        matches, date_str = _match_context(db)
        if not matches:
            return {"kind": "match_winners", "date": date_str,
                    "skipped": "no fixtures today"}
        client = _client()
        user_payload = {"date_wib": date_str, "fixtures": matches}
        # Note: .parse() derives output_config.format from output_format, so we
        # don't pass a separate output_config here. Adaptive thinking handles the
        # reasoning depth; effort defaults to high.
        resp = client.messages.parse(
            model=MODEL,
            max_tokens=8000,
            thinking={"type": "adaptive"},
            system=_system_blocks(),
            messages=[{
                "role": "user",
                "content": (
                    "Predict each of today's World Cup fixtures below. Return one "
                    "prediction per fixture, preserving fixture_id and team codes.\n\n"
                    + json.dumps(user_payload, ensure_ascii=False)
                ),
            }],
            output_format=MatchPredictions,
        )
        cache_read = getattr(resp.usage, "cache_read_input_tokens", 0) or 0
        parsed = resp.parsed_output
        payload = parsed.model_dump() if parsed else {"predictions": []}
        _persist(db, date_str, "match_winners", payload, cache_read)
        logger.info("match_winners: %d fixtures, cache_read=%d",
                    len(matches), cache_read)
        return {"kind": "match_winners", "date": date_str,
                "fixtures": len(matches), "cache_read": cache_read, **payload}
    finally:
        db.close()


def predict_top_scorer() -> dict:
    db = SessionLocal()
    try:
        date_str = _run_date()
        candidates = _scorer_candidates(db)
        if not candidates:
            return {"kind": "top_scorer", "date": date_str,
                    "skipped": "no squads loaded"}
        client = _client()
        user_payload = {"date_wib": date_str, "candidates": candidates}
        resp = client.messages.parse(
            model=MODEL,
            max_tokens=4000,
            thinking={"type": "adaptive"},
            system=_system_blocks(),
            messages=[{
                "role": "user",
                "content": (
                    "From the candidate list below, predict the top 5 most likely "
                    "Golden Boot winners (tournament top scorers) given current goals "
                    "and form. Rank 1-5 with projected final goal totals.\n\n"
                    + json.dumps(user_payload, ensure_ascii=False)
                ),
            }],
            output_format=TopScorerForecast,
        )
        cache_read = getattr(resp.usage, "cache_read_input_tokens", 0) or 0
        parsed = resp.parsed_output
        payload = parsed.model_dump() if parsed else {"ranking": [], "summary": ""}
        _persist(db, date_str, "top_scorer", payload, cache_read)
        logger.info("top_scorer: %d candidates, cache_read=%d",
                    len(candidates), cache_read)
        return {"kind": "top_scorer", "date": date_str,
                "cache_read": cache_read, **payload}
    finally:
        db.close()


def run_daily_predictions() -> dict:
    """Generate both prediction artifacts. Errors are isolated per artifact."""
    out: dict = {"match_winners": None, "top_scorer": None, "errors": []}
    for key, fn in (("match_winners", predict_match_winners),
                    ("top_scorer", predict_top_scorer)):
        try:
            out[key] = fn()
        except Exception as e:
            logger.exception("%s prediction failed: %s", key, e)
            out["errors"].append({"kind": key, "error": f"{type(e).__name__}: {e}"})
    return out


# ─── Read helpers (for the API) ────────────────────────────────────

def get_prediction(kind: str, date_str: Optional[str] = None) -> Optional[dict]:
    db = SessionLocal()
    try:
        q = db.query(Prediction).filter(Prediction.kind == kind)
        if date_str:
            q = q.filter(Prediction.prediction_date == date_str)
        row = q.order_by(Prediction.prediction_date.desc()).first()
        if not row:
            return None
        return {
            "kind": row.kind,
            "date": row.prediction_date,
            "model": row.model,
            "generated_at": row.generated_at.isoformat() if row.generated_at else None,
            "data": json.loads(row.payload) if row.payload else None,
        }
    finally:
        db.close()


# ─── Evaluation vs actual results ──────────────────────────────────

def _actual_for_fixture(db: Session, fixture_id: int) -> dict:
    """Current actual state of a fixture. settled=True only when finished."""
    f = db.query(Fixture).filter(Fixture.id == fixture_id).one_or_none()
    if not f:
        return {"status": "unknown", "home_score": None, "away_score": None,
                "winner": None, "settled": False}
    if f.status != "finished" or f.home_score is None or f.away_score is None:
        return {"status": f.status, "home_score": f.home_score,
                "away_score": f.away_score, "winner": None, "settled": False}
    hs, as_ = int(f.home_score), int(f.away_score)
    if hs > as_:
        winner = f.home_team.code if f.home_team else "home"
    elif as_ > hs:
        winner = f.away_team.code if f.away_team else "away"
    else:
        winner = "draw"
    return {"status": "finished", "home_score": hs, "away_score": as_,
            "winner": winner, "settled": True}


def _evaluate_match_payload(db: Session, payload: dict) -> tuple[list[dict], dict]:
    """Annotate each prediction with the actual result + correctness; return day stats."""
    items = payload.get("predictions", []) if payload else []
    out, evaluated, correct, exact = [], 0, 0, 0
    for it in items:
        actual = _actual_for_fixture(db, it.get("fixture_id"))
        is_correct = None
        if actual["settled"]:
            evaluated += 1
            is_correct = (it.get("predicted_winner") == actual["winner"])
            if is_correct:
                correct += 1
            if it.get("likely_score") == f'{actual["home_score"]}-{actual["away_score"]}':
                exact += 1
        out.append({**it, "actual": actual, "correct": is_correct})
    pct = round(correct / evaluated * 100, 1) if evaluated else None
    return out, {"evaluated": evaluated, "correct": correct,
                 "exact_score": exact, "accuracy_pct": pct}


def get_match_history(page: int = 1, page_size: int = 10) -> dict:
    """Paginated day-by-day match predictions, each evaluated against actuals."""
    page = max(1, page)
    page_size = max(1, min(page_size, 50))
    db = SessionLocal()
    try:
        q = (db.query(Prediction)
               .filter(Prediction.kind == "match_winners")
               .order_by(Prediction.prediction_date.desc()))
        total = q.count()
        rows = q.offset((page - 1) * page_size).limit(page_size).all()
        days = []
        for row in rows:
            payload = json.loads(row.payload) if row.payload else {}
            items, stats = _evaluate_match_payload(db, payload)
            days.append({
                "date": row.prediction_date,
                "model": row.model,
                "generated_at": row.generated_at.isoformat() if row.generated_at else None,
                "predictions": items,
                "accuracy": stats,
            })
        return {
            "page": page, "page_size": page_size, "total": total,
            "pages": max(1, math.ceil(total / page_size)),
            "days": days,
        }
    finally:
        db.close()


def get_overall_accuracy() -> dict:
    """Aggregate match-winner accuracy across every stored prediction day."""
    db = SessionLocal()
    try:
        rows = (db.query(Prediction)
                  .filter(Prediction.kind == "match_winners").all())
        evaluated = correct = exact = 0
        days_with_data = 0
        for row in rows:
            payload = json.loads(row.payload) if row.payload else {}
            _, stats = _evaluate_match_payload(db, payload)
            if stats["evaluated"]:
                days_with_data += 1
            evaluated += stats["evaluated"]
            correct   += stats["correct"]
            exact     += stats["exact_score"]
        pct       = round(correct / evaluated * 100, 1) if evaluated else None
        exact_pct = round(exact / evaluated * 100, 1) if evaluated else None
        return {
            "total_days": len(rows),
            "days_evaluated": days_with_data,
            "evaluated": evaluated,
            "correct": correct,
            "accuracy_pct": pct,
            "exact_score": exact,
            "exact_score_pct": exact_pct,
        }
    finally:
        db.close()
