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

from collections import defaultdict

from database import SessionLocal
from models import Fixture, Player, Team, Prediction, MatchPredictionRow
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

# OpenRouter fallback — used automatically if the Anthropic (Claude) call fails,
# e.g. the ANTHROPIC_API_KEY is missing/invalid/expired or rate-limited.
# OpenRouter exposes an OpenAI-compatible API; we validate its JSON response
# against the same Pydantic schemas.
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "").strip()
OPENROUTER_MODEL   = os.getenv("OPENROUTER_MODEL", "anthropic/claude-sonnet-4")
OPENROUTER_URL     = "https://openrouter.ai/api/v1/chat/completions"


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


SYSTEM_METHODOLOGY = """You are a calibrated football forecaster for the FIFA World Cup 2026. Your goal is accuracy and good probability calibration, NOT bold favourite-backed picks.

Signals, in rough order of importance:
1. Recent tournament form / group standings so far (results already in this tournament) — this is the strongest signal once games have been played. Early in the group stage there is little form, so widen your uncertainty.
2. Squad quality: depth, club level, and goal threat of key players. A few elite names matter less than overall balance.
3. FIFA ranking (lower = stronger) — a useful prior, but ranking gaps overstate real on-pitch gaps, especially between two well-organised sides. Do not back a favourite on ranking alone.
4. Match context: home advantage for co-hosts (USA/Canada/Mexico), and group situation (a side already qualified or eliminated may rotate).
5. GDP — essentially noise. Use only to break an otherwise perfect tie. Never let it move a pick.

DRAWS — the most common mistake is under-predicting them. Apply this deliberately:
- World Cup group matches are low-scoring and frequently level. Across a group stage, roughly a quarter to a third of matches end in a draw, and that rises when two sides are evenly matched, both defensively solid, or playing a cautious opener.
- When the two teams are close (similar ranking, no clear quality gap, or a strong defensive side facing a favourite), the SINGLE most likely outcome is often a draw. In those cases make draw_pct the plurality and set predicted_winner to "draw".
- Only assign a favourite a win probability above ~55% when there is a clear, multi-factor edge (quality AND form AND context), not just a better ranking.

Output rules:
- home_win_pct + draw_pct + away_win_pct MUST sum to 100.
- predicted_winner = the outcome with the highest probability — a team code, or "draw" when draw_pct is the highest of the three. Be honest: if you wrote a high draw_pct, your pick should be "draw".
- Calibration anchors: clear mismatch ~60/22/18; modest favourite ~45/30/25; even tie ~33/34/33; defensive underdog vs favourite ~38/34/28.
- likely_score: realistic and low. Most World Cup matches finish 0-0, 1-0, 1-1, or 2-1. Reserve 3+ goals for genuine mismatches. If you predict "draw", the score must be level (e.g. 1-1 or 0-0).
- confidence: "high" only with a decisive, well-evidenced edge; "medium" for a lean; "low" for a near-coin-flip (which most even group games are).
- Keep reasoning to 1-2 sentences naming the decisive factors. Never invent players, scores, or fixtures not in the provided data.

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


def _openrouter_structured(system_text: str, user_text: str,
                           output_model: type[BaseModel], max_tokens: int) -> BaseModel:
    """Fallback: call OpenRouter's OpenAI-compatible chat API and validate the
    JSON response against the same Pydantic schema used for Claude."""
    import requests

    schema = json.dumps(output_model.model_json_schema(), ensure_ascii=False)
    resp = requests.post(
        OPENROUTER_URL,
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "X-Title": "wc2026-predictions",
        },
        json={
            "model": OPENROUTER_MODEL,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_text},
                {"role": "user", "content": (
                    user_text
                    + "\n\nRespond with ONLY a single JSON object that conforms exactly "
                      "to this JSON Schema (no markdown, no commentary):\n" + schema
                )},
            ],
        },
        timeout=120,
    )
    resp.raise_for_status()
    content = (resp.json()["choices"][0]["message"]["content"] or "").strip()
    if content.startswith("```"):  # defensively strip accidental markdown fences
        content = content[content.find("\n") + 1: content.rfind("```")].strip()
    return output_model.model_validate_json(content)


def _predict_structured(instruction: str, payload: dict,
                        output_model: type[BaseModel], max_tokens: int):
    """Run one structured prediction. Tries Anthropic (Claude) first; on any
    failure, falls back to OpenRouter when OPENROUTER_API_KEY is configured.
    Returns (parsed_model_or_None, cache_read_tokens, model_used)."""
    system_text = SYSTEM_METHODOLOGY + _reference_table()
    user_text = instruction + "\n\n" + json.dumps(payload, ensure_ascii=False)

    # Primary: Anthropic Claude via the SDK's structured-output parse().
    try:
        client = _client()
        resp = client.messages.parse(
            model=MODEL,
            max_tokens=max_tokens,
            thinking={"type": "adaptive"},
            system=_system_blocks(),
            messages=[{"role": "user", "content": user_text}],
            output_format=output_model,
        )
        cache_read = getattr(resp.usage, "cache_read_input_tokens", 0) or 0
        return resp.parsed_output, cache_read, MODEL
    except Exception as e:
        if not OPENROUTER_API_KEY:
            raise
        logger.warning("Claude prediction failed (%s); falling back to OpenRouter (%s)",
                       e, OPENROUTER_MODEL)

    # Fallback: OpenRouter (OpenAI-compatible), same schema.
    parsed = _openrouter_structured(system_text, user_text, output_model, max_tokens)
    return parsed, 0, OPENROUTER_MODEL


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
             cache_read: int, model_used: str = MODEL) -> None:
    existing = (db.query(Prediction)
                  .filter(Prediction.prediction_date == date_str,
                          Prediction.kind == kind).one_or_none())
    if existing is None:
        existing = Prediction(prediction_date=date_str, kind=kind)
        db.add(existing)
    existing.payload      = json.dumps(payload, ensure_ascii=False)
    existing.model        = model_used
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
        parsed, cache_read, model_used = _predict_structured(
            "Predict each of today's World Cup fixtures below. Return one "
            "prediction per fixture, preserving fixture_id and team codes.",
            {"date_wib": date_str, "fixtures": matches},
            MatchPredictions, 8000,
        )
        payload = parsed.model_dump() if parsed else {"predictions": []}
        _persist_match_rows(db, payload.get("predictions", []), model_used)
        logger.info("match_winners: %d fixtures, cache_read=%d, model=%s",
                    len(matches), cache_read, model_used)
        return {"kind": "match_winners", "date": date_str,
                "fixtures": len(matches), "cache_read": cache_read,
                "model": model_used, **payload}
    finally:
        db.close()


def _persist_match_rows(db: Session, items: list[dict], model_used: str = MODEL) -> None:
    """Upsert one prediction row per fixture. Only ever called for scheduled
    fixtures, so a finished match keeps its last pre-kickoff prediction."""
    for it in items:
        fid = it.get("fixture_id")
        if fid is None:
            continue
        row = (db.query(MatchPredictionRow)
                 .filter(MatchPredictionRow.fixture_id == fid).one_or_none())
        if row is None:
            row = MatchPredictionRow(fixture_id=fid)
            db.add(row)
        row.predicted_winner = it.get("predicted_winner")
        row.home_win_pct     = it.get("home_win_pct")
        row.draw_pct         = it.get("draw_pct")
        row.away_win_pct     = it.get("away_win_pct")
        row.likely_score     = it.get("likely_score")
        row.confidence       = it.get("confidence")
        row.reasoning        = it.get("reasoning")
        row.model            = model_used
        row.predicted_at     = datetime.now(timezone.utc)
    db.commit()


def predict_top_scorer() -> dict:
    db = SessionLocal()
    try:
        date_str = _run_date()
        candidates = _scorer_candidates(db)
        if not candidates:
            return {"kind": "top_scorer", "date": date_str,
                    "skipped": "no squads loaded"}
        parsed, cache_read, model_used = _predict_structured(
            "From the candidate list below, predict the top 5 most likely "
            "Golden Boot winners (tournament top scorers) given current goals "
            "and form. Rank 1-5 with projected final goal totals.",
            {"date_wib": date_str, "candidates": candidates},
            TopScorerForecast, 4000,
        )
        payload = parsed.model_dump() if parsed else {"ranking": [], "summary": ""}
        _persist(db, date_str, "top_scorer", payload, cache_read, model_used)
        logger.info("top_scorer: %d candidates, cache_read=%d, model=%s",
                    len(candidates), cache_read, model_used)
        return {"kind": "top_scorer", "date": date_str,
                "cache_read": cache_read, "model": model_used, **payload}
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


def _build_item(db: Session, row: MatchPredictionRow, f: Optional[Fixture]) -> dict:
    """Build an evaluated prediction item from a stored row + its fixture."""
    home = f.home_team.code if (f and f.home_team) else "?"
    away = f.away_team.code if (f and f.away_team) else "?"
    actual = _actual_for_fixture(db, row.fixture_id)
    correct: Optional[bool] = None
    exact = False
    if actual["settled"]:
        correct = (row.predicted_winner == actual["winner"])
        exact = (row.likely_score == f'{actual["home_score"]}-{actual["away_score"]}')
    return {
        "fixture_id":       row.fixture_id,
        "home":             home,
        "away":             away,
        "predicted_winner": row.predicted_winner,
        "home_win_pct":     row.home_win_pct,
        "draw_pct":         row.draw_pct,
        "away_win_pct":     row.away_win_pct,
        "likely_score":     row.likely_score,
        "confidence":       row.confidence,
        "reasoning":        row.reasoning,
        "kickoff":          f.kickoff.isoformat() if (f and f.kickoff) else None,
        "actual":           actual,
        "correct":          correct,
        "_exact":           exact,
    }


def _match_day(f: Optional[Fixture]) -> str:
    if f and f.kickoff:
        return f.kickoff.astimezone(WIB).strftime("%Y-%m-%d")
    return "TBD"


def get_today_match_predictions() -> Optional[dict]:
    """Predictions for fixtures kicking off within the next window (the live view)."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        end = now + timedelta(hours=PREDICTION_WINDOW_HOURS)
        fixtures = (db.query(Fixture)
                      .filter(Fixture.status == "scheduled",
                              Fixture.kickoff.isnot(None),
                              Fixture.kickoff >= now - timedelta(hours=1),
                              Fixture.kickoff <= end)
                      .order_by(Fixture.kickoff).all())
        if not fixtures:
            return None
        fids = [f.id for f in fixtures]
        rows = {r.fixture_id: r for r in
                db.query(MatchPredictionRow)
                  .filter(MatchPredictionRow.fixture_id.in_(fids)).all()}
        items, latest, model = [], None, None
        for f in fixtures:
            r = rows.get(f.id)
            if not r:
                continue
            it = _build_item(db, r, f)
            it.pop("_exact", None)
            items.append(it)
            if r.predicted_at and (latest is None or r.predicted_at > latest):
                latest, model = r.predicted_at, r.model
        if not items:
            return None
        return {
            "kind": "match_winners",
            "date": datetime.now(WIB).strftime("%Y-%m-%d"),
            "model": model,
            "generated_at": latest.isoformat() if latest else None,
            "data": {"predictions": items},
        }
    finally:
        db.close()


def _day_stats(items: list[dict]) -> dict:
    ev = cor = ex = 0
    for it in items:
        if it.get("correct") is not None:
            ev += 1
            if it["correct"]:
                cor += 1
            if it.get("_exact"):
                ex += 1
    pct = round(cor / ev * 100, 1) if ev else None
    return {"evaluated": ev, "correct": cor, "exact_score": ex, "accuracy_pct": pct}


def get_match_history(page: int = 1, page_size: int = 10) -> dict:
    """Paginated day-by-day match predictions (grouped by kickoff day), evaluated."""
    page = max(1, page)
    page_size = max(1, min(page_size, 50))
    db = SessionLocal()
    try:
        rows = db.query(MatchPredictionRow).all()
        if not rows:
            return {"page": page, "page_size": page_size, "total": 0,
                    "pages": 1, "days": []}
        fmap = {f.id: f for f in db.query(Fixture)
                  .filter(Fixture.id.in_([r.fixture_id for r in rows])).all()}

        by_day: dict[str, list[dict]] = defaultdict(list)
        meta: dict[str, tuple] = {}   # day -> (latest predicted_at, model)
        for r in rows:
            f = fmap.get(r.fixture_id)
            day = _match_day(f)
            by_day[day].append(_build_item(db, r, f))
            pa = r.predicted_at
            if day not in meta or (pa and meta[day][0] and pa > meta[day][0]):
                meta[day] = (pa, r.model)

        # Newest day first; "TBD" (no kickoff yet) sorts last.
        days_sorted = sorted((d for d in by_day if d != "TBD"), reverse=True)
        if "TBD" in by_day:
            days_sorted.append("TBD")
        total = len(days_sorted)
        page_days = days_sorted[(page - 1) * page_size: page * page_size]

        out = []
        for day in page_days:
            items = sorted(by_day[day], key=lambda x: x["kickoff"] or "")
            stats = _day_stats(items)
            pa, model = meta.get(day, (None, None))
            out.append({
                "date": day,
                "model": model,
                "generated_at": pa.isoformat() if pa else None,
                "predictions": [{k: v for k, v in it.items() if k != "_exact"} for it in items],
                "accuracy": stats,
            })
        return {
            "page": page, "page_size": page_size, "total": total,
            "pages": max(1, math.ceil(total / page_size)),
            "days": out,
        }
    finally:
        db.close()


def get_overall_accuracy() -> dict:
    """Aggregate match-winner accuracy across every predicted fixture."""
    db = SessionLocal()
    try:
        rows = db.query(MatchPredictionRow).all()
        fmap = {f.id: f for f in db.query(Fixture)
                  .filter(Fixture.id.in_([r.fixture_id for r in rows])).all()} if rows else {}
        evaluated = correct = exact = 0
        days = set()
        for r in rows:
            f = fmap.get(r.fixture_id)
            days.add(_match_day(f))
            it = _build_item(db, r, f)
            if it["correct"] is not None:
                evaluated += 1
                if it["correct"]:
                    correct += 1
                if it["_exact"]:
                    exact += 1
        pct       = round(correct / evaluated * 100, 1) if evaluated else None
        exact_pct = round(exact / evaluated * 100, 1) if evaluated else None
        return {
            "total_days": len(days),
            "days_evaluated": len(days),
            "evaluated": evaluated,
            "correct": correct,
            "accuracy_pct": pct,
            "exact_score": exact,
            "exact_score_pct": exact_pct,
        }
    finally:
        db.close()
