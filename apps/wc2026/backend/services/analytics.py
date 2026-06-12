"""Visitor analytics: write page-view rows + compute admin summary stats."""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, distinct
from sqlalchemy.orm import Session
from user_agents import parse as parse_user_agent

from database import SessionLocal
from models import PageView

logger = logging.getLogger(__name__)

# Don't waste a row on noise / bots.
_BLOCKED_AGENT_FRAGMENTS = (
    "bot", "spider", "crawler", "headlesschrome", "facebookexternalhit",
    "preview", "monitor", "uptime",
)


def _classify_ua(ua_string: str) -> tuple[str, str, str]:
    """Return (browser, os, device) — strings ready for the analytics table."""
    if not ua_string:
        return ("Unknown", "Unknown", "Unknown")
    ua = parse_user_agent(ua_string)
    browser = f"{ua.browser.family}"
    osname  = f"{ua.os.family}"
    if ua.is_mobile:   device = "Mobile"
    elif ua.is_tablet: device = "Tablet"
    elif ua.is_bot:    device = "Bot"
    else:              device = "PC"
    return (browser, osname, device)


def _is_bot(ua_string: str) -> bool:
    lc = (ua_string or "").lower()
    return any(f in lc for f in _BLOCKED_AGENT_FRAGMENTS)


def record_view(
    path: str,
    ip: Optional[str],
    user_agent: Optional[str],
    referrer: Optional[str],
    country: Optional[str],
) -> None:
    """Insert one page-view row. Silently no-ops for bots / on errors."""
    if _is_bot(user_agent or ""):
        return
    browser, osname, device = _classify_ua(user_agent or "")
    db = SessionLocal()
    try:
        db.add(PageView(
            path=path or "/",
            referrer=(referrer or None),
            ip=ip,
            user_agent=(user_agent or "")[:500] or None,
            country=(country or None),
            browser=browser,
            os=osname,
            device=device,
        ))
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning("record_view failed: %s", e)
    finally:
        db.close()


def summary(days: int = 7, top: int = 10, recent: int = 20) -> dict:
    """Aggregate stats for the admin dashboard. Read-only."""
    now    = datetime.now(timezone.utc)
    since  = now - timedelta(days=days)
    db     = SessionLocal()
    try:
        total_views      = db.query(func.count(PageView.id)).scalar() or 0
        views_window     = (db.query(func.count(PageView.id))
                              .filter(PageView.timestamp >= since)
                              .scalar() or 0)
        unique_ips       = (db.query(func.count(distinct(PageView.ip)))
                              .filter(PageView.timestamp >= since,
                                      PageView.ip.isnot(None))
                              .scalar() or 0)

        def _top(col, lim=top):
            return [
                {"label": (k or "—"), "views": int(n)}
                for k, n in (db.query(col, func.count(PageView.id))
                               .filter(PageView.timestamp >= since)
                               .group_by(col)
                               .order_by(func.count(PageView.id).desc())
                               .limit(lim)
                               .all())
            ]

        # Per-day counts for the chart (last `days`).
        per_day = (db.query(func.date(PageView.timestamp).label("day"),
                            func.count(PageView.id),
                            func.count(distinct(PageView.ip)))
                     .filter(PageView.timestamp >= since)
                     .group_by("day").order_by("day").all())

        recent_rows = (db.query(PageView)
                         .order_by(PageView.timestamp.desc())
                         .limit(recent)
                         .all())

        return {
            "window_days":   days,
            "total_views":   total_views,
            "views_window":  views_window,
            "unique_ips":    unique_ips,
            "by_day":        [{"date": str(d), "views": int(v), "unique": int(u)}
                              for d, v, u in per_day],
            "top_paths":     _top(PageView.path),
            "top_browsers":  _top(PageView.browser),
            "top_os":        _top(PageView.os),
            "top_devices":   _top(PageView.device),
            "top_countries": _top(PageView.country),
            "recent":        [
                {
                    "timestamp":  r.timestamp.isoformat() if r.timestamp else None,
                    "path":       r.path,
                    "ip":         r.ip,
                    "country":    r.country,
                    "browser":    r.browser,
                    "os":         r.os,
                    "device":     r.device,
                    "referrer":   r.referrer,
                }
                for r in recent_rows
            ],
        }
    finally:
        db.close()
