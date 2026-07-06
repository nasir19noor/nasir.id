"""
FolaPlay match highlights (https://www.youtube.com/@folaplayapps).

Scrapes the channel's "FULL MATCH HIGHLIGHT" videos and maps each to a tie,
keyed by the two team codes sorted alphabetically (order-independent and unique
across the tournament). Runs hourly next to the ESPN pull, so new uploads
surface automatically. The channel titles matches with Indonesian country names
(Inggris = England, Mesir = Egypt, …), which we translate back to codes; the
same table drives the search-URL fallback for ties without a video yet.

The scrape uses YouTube's public InnerTube endpoint. It is inherently brittle
(YouTube can change its payload shape), so every failure is swallowed and the
last-known rows are kept — stale links beat none.
"""
import re
import logging
from urllib.parse import quote

import requests
from sqlalchemy.orm import Session

from database import SessionLocal
from models import MatchHighlight

logger = logging.getLogger(__name__)

CHANNEL_URL   = "https://www.youtube.com/@folaplayapps"
_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
       "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")

# YouTube's public "WEB" InnerTube key is a fixed constant shared by every web
# client. Using the browse API directly (browseId + continuations) avoids the
# HTML channel page, which datacenter IPs often get a cookie-consent wall for —
# the reason a scrape can work locally yet return nothing in production.
_INNERTUBE_KEY  = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
_CHANNEL_UCID   = "UCI99iwswVelRuLGEWuanwcQ"      # @folaplayapps
_CLIENT_VERSION = "2.20240606.06.00"
_VIDEOS_PARAMS  = "EgZ2aWRlb3PyBgQKAjoA"          # channel "Videos" tab, newest first
_BROWSE_URL = f"https://www.youtube.com/youtubei/v1/browse?key={_INNERTUBE_KEY}&prettyPrint=false"
_MAX_PAGES = 20

# ─── Team code ⇄ Indonesian name (as FolaPlay titles them) ─────────

TEAM_NAME_ID: dict[str, str] = {
    "ALG": "Algeria", "ARG": "Argentina", "AUS": "Australia", "AUT": "Austria",
    "BEL": "Belgia", "BIH": "Bosnia", "BRA": "Brasil", "CAN": "Kanada",
    "COL": "Kolombia", "CPV": "Tanjung Verde", "CRO": "Kroasia", "CUR": "Curacao",
    "CZE": "Ceko", "DRC": "RD Kongo", "ECU": "Ekuador", "EGY": "Mesir",
    "ENG": "Inggris", "ESP": "Spanyol", "FRA": "Prancis", "GER": "Jerman",
    "GHA": "Ghana", "HAI": "Haiti", "IRN": "Iran", "IRQ": "Irak",
    "IVC": "Pantai Gading", "JOR": "Jordania", "JPN": "Jepang",
    "KOR": "Korea Selatan", "MAR": "Maroko", "MEX": "Meksiko", "NED": "Belanda",
    "NOR": "Norwegia", "NZL": "Selandia Baru", "PAN": "Panama", "PAR": "Paraguay",
    "POR": "Portugal", "QAT": "Qatar", "RSA": "Afrika Selatan", "SAU": "Arab Saudi",
    "SCO": "Skotlandia", "SEN": "Senegal", "SUI": "Swiss", "SWE": "Swedia",
    "TUN": "Tunisia", "TUR": "Turki", "URU": "Uruguay", "USA": "Amerika Serikat",
    "UZB": "Uzbekistan",
}

# Reverse (upper-cased) for title parsing, plus aliases the channel uses.
_NAME_TO_CODE: dict[str, str] = {v.upper(): k for k, v in TEAM_NAME_ID.items()}
_NAME_TO_CODE["KONGO"] = "DRC"          # DR Congo, sometimes without the "RD"
_NAME_TO_CODE["AMERIKA"] = "USA"        # guard against truncated titles


# ─── Scrape ────────────────────────────────────────────────────────

def _extract_videos(text: str) -> list[tuple[str, str]]:
    """Pull (videoId, title) pairs out of a chunk of InnerTube JSON. YouTube's
    grid uses lockupViewModel: contentId holds the id, the metadata view model
    holds the title."""
    out: list[tuple[str, str]] = []
    for chunk in text.split('"lockupViewModel"'):
        m_id = re.search(r'"contentId":"([\w-]{11})"', chunk)
        m_t  = re.search(r'"lockupMetadataViewModel":\{"title":\{"content":"([^"]+)"', chunk)
        if m_id and m_t:
            out.append((m_id.group(1), m_t.group(1)))
    return out


def _browse(session: requests.Session, continuation: str | None) -> str:
    """One InnerTube browse call: the channel's Videos tab, or a continuation."""
    body: dict = {"context": {"client": {"clientName": "WEB",
                                         "clientVersion": _CLIENT_VERSION,
                                         "hl": "en", "gl": "US"}}}
    if continuation:
        body["continuation"] = continuation
    else:
        body["browseId"] = _CHANNEL_UCID
        body["params"] = _VIDEOS_PARAMS
    resp = session.post(_BROWSE_URL, json=body, timeout=30)
    resp.raise_for_status()
    return resp.text


def _scrape_channel() -> list[tuple[str, str]]:
    """Every (videoId, title) on the channel, via the InnerTube browse API and
    its continuation tokens."""
    session = requests.Session()
    session.headers.update({"User-Agent": _UA, "Accept-Language": "en-US,en;q=0.9"})

    videos: list[tuple[str, str]] = []
    seen: set[str] = set()
    cont: str | None = None
    for _ in range(_MAX_PAGES):
        txt = _browse(session, cont)
        added = 0
        for vid, title in _extract_videos(txt):
            if vid not in seen:
                seen.add(vid)
                videos.append((vid, title))
                added += 1
        m = re.search(r'"continuationCommand":\{"token":"([^"]+)"', txt)
        cont = m.group(1) if m else None
        if not cont or added == 0:
            break
    if not videos:
        raise RuntimeError("InnerTube browse returned no videos")
    return videos


_PAIR_RE = re.compile(r"HIGHLIGHT\s*\|?\s*(.+?)\s*\|?\s*FIFA WORLD CUP", re.IGNORECASE)


def _to_pair_map(videos: list[tuple[str, str]]) -> dict[str, tuple[str, str]]:
    """{'ENG-MEX': (video_id, title)} for every 'FULL MATCH HIGHLIGHT' video we
    can resolve to two known teams."""
    result: dict[str, tuple[str, str]] = {}
    for vid, title in videos:
        if not title.strip().upper().startswith("FULL MATCH HIGHLIGHT"):
            continue
        m = _PAIR_RE.search(title)
        if not m:
            continue
        sides = re.split(r"\s+VS\s+", m.group(1).strip(), flags=re.IGNORECASE)
        if len(sides) != 2:
            continue
        a = _NAME_TO_CODE.get(sides[0].strip().upper())
        b = _NAME_TO_CODE.get(sides[1].strip().upper())
        if not a or not b or a == b:
            continue
        result["-".join(sorted([a, b]))] = (vid, title)
    return result


def refresh_highlights() -> dict:
    """Scrape the channel and upsert the video map. Never deletes: a failed or
    empty scrape leaves existing rows untouched."""
    summary = {"videos": 0, "mapped": 0, "upserted": 0, "errors": []}
    try:
        videos = _scrape_channel()
    except Exception as e:
        logger.warning("highlights scrape failed: %s", e)
        summary["errors"].append(f"{type(e).__name__}: {e}")
        return summary
    summary["videos"] = len(videos)

    pairs = _to_pair_map(videos)
    summary["mapped"] = len(pairs)
    if not pairs:
        logger.info("highlights: no FULL MATCH videos resolved; keeping existing rows")
        return summary

    db: Session = SessionLocal()
    try:
        for key, (vid, title) in pairs.items():
            row = db.get(MatchHighlight, key)
            if row is None:
                db.add(MatchHighlight(pair_key=key, video_id=vid, title=title))
                summary["upserted"] += 1
            elif row.video_id != vid or row.title != title:
                row.video_id, row.title = vid, title
                summary["upserted"] += 1
        db.commit()
    finally:
        db.close()
    logger.info("highlights refresh: %s", summary)
    return summary


# ─── Serving ───────────────────────────────────────────────────────

def load_video_map(db: Session) -> dict[str, str]:
    """{'ENG-MEX': video_id} for use while building fixture/knockout responses."""
    return {r.pair_key: r.video_id for r in db.query(MatchHighlight).all()}


def highlight_url(home, away, video_map: dict[str, str]) -> str | None:
    """Specific FolaPlay video when we have one, else a channel search scoped by
    the Indonesian team names. `home`/`away` are Team ORM rows (or None)."""
    if home is None or away is None:
        return None
    video_id = video_map.get("-".join(sorted([home.code, away.code])))
    if video_id:
        return f"https://www.youtube.com/watch?v={video_id}"
    hn = TEAM_NAME_ID.get(home.code, home.name)
    an = TEAM_NAME_ID.get(away.code, away.name)
    return f"{CHANNEL_URL}/search?query=" + quote(f"{hn} vs {an} highlight")
