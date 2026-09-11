"""Attach highlight-video links to fixtures.

Video URLs are curated by hand, not published by ESPN, so they live in
`data/match_videos.json` and are matched onto fixtures by club name. Names are
compared with accents and case stripped ("Atletico Madrid" == "Atlético
Madrid"), which is enough to survive ESPN's occasional renaming without
needing fixture ids in the data file.

Applied at the end of every refresh, so a link added to the file appears on
the next deploy without a manual step, and survives ESPN upserts (which never
touch the column).
"""
import json
import logging
import os
import unicodedata

from sqlalchemy.orm import Session

from models import Fixture

logger = logging.getLogger(__name__)

VIDEO_FILE = os.getenv(
    "MATCH_VIDEO_FILE",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                 "data", "match_videos.json"),
)


def _key(name: str) -> str:
    """Accent- and case-insensitive club key."""
    nfkd = unicodedata.normalize("NFKD", name or "")
    return "".join(c for c in nfkd if not unicodedata.combining(c)).strip().upper()


def load_videos(path: str = None) -> list[dict]:
    path = path or VIDEO_FILE
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh).get("videos", []) or []
    except FileNotFoundError:
        logger.info("No match video file at %s — skipping video links.", path)
    except (OSError, json.JSONDecodeError) as e:
        logger.warning("Could not read %s: %s", path, e)
    return []


def apply_video_links(db: Session, path: str = None) -> dict:
    """Set Fixture.video_url from the curated file. Returns a small summary."""
    entries = load_videos(path)
    if not entries:
        return {"linked": 0, "unmatched": []}

    by_pair = {}
    for fx in db.query(Fixture).all():
        if fx.home_team and fx.away_team:
            by_pair[(_key(fx.home_team.name), _key(fx.away_team.name))] = fx

    linked, unmatched = 0, []
    for entry in entries:
        url = (entry.get("url") or "").strip()
        pair = (_key(entry.get("home", "")), _key(entry.get("away", "")))
        fx = by_pair.get(pair)
        if not url:
            continue
        if fx is None:
            unmatched.append(f"{entry.get('home')} vs {entry.get('away')}")
            continue
        if fx.video_url != url:
            fx.video_url = url
            linked += 1

    if unmatched:
        logger.warning("Video links with no matching fixture: %s", ", ".join(unmatched))
    return {"linked": linked, "unmatched": unmatched}
