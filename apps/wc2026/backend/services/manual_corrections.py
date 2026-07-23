"""Manual data corrections for known gaps in ESPN's per-match roster stats.

ESPN's public box score sometimes fails to credit a player's first caution on
a second-yellow-card dismissal (only the resulting red gets tallied). This was
confirmed by reconciling each match's card-event timeline against its summed
per-player roster stats — see the two entries below, both cross-checked
against the match's own event count *and* confirmed by direct knowledge of the
match. Applied via POST /admin/correct-cards; safe to re-run (idempotent — it
sets absolute values, not deltas).

Add further entries here only when a discrepancy has been independently
confirmed, not merely suspected from a reconciliation gap.
"""
import logging
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Player, Team

logger = logging.getLogger(__name__)

CARD_CORRECTIONS = [
    {
        "team": "ARG", "name": "Enzo Fernández",
        "yellow_cards": 2, "red_cards": 1,
        "reason": "Final (ESP 1-0 ARG): second-yellow dismissal. ESPN's roster "
                  "stats showed 0Y/1R — the match's keyEvents log (5 Yellow "
                  "Card entries) didn't reconcile with the summed per-player "
                  "total (4), a 1-card gap consistent with a missing caution.",
    },
    {
        "team": "SUI", "name": "Breel Embolo",
        "yellow_cards": 1, "red_cards": 1,
        "reason": "Round of 16 (SUI vs ARG): second-yellow dismissal. Same "
                  "pattern — ESPN's roster stats showed 0Y/1R against a "
                  "reconciled event-log gap of 1 card.",
    },
]


def apply_card_corrections() -> dict:
    db: Session = SessionLocal()
    summary = {"applied": [], "not_found": []}
    try:
        for c in CARD_CORRECTIONS:
            p = (db.query(Player)
                   .join(Team, Team.id == Player.team_id)
                   .filter(Team.code == c["team"], Player.name == c["name"])
                   .one_or_none())
            if p is None:
                summary["not_found"].append(f"{c['team']}:{c['name']}")
                continue
            before = {"yellow_cards": p.yellow_cards, "red_cards": p.red_cards}
            p.yellow_cards = c["yellow_cards"]
            p.red_cards = c["red_cards"]
            summary["applied"].append({
                "player": c["name"], "team": c["team"],
                "before": before,
                "after": {"yellow_cards": p.yellow_cards, "red_cards": p.red_cards},
            })
        db.commit()
    finally:
        db.close()
    logger.info("manual card corrections applied: %s", summary)
    return summary
