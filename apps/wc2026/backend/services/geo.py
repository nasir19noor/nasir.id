"""Resolve a public IP to a country code, with an in-memory cache.

Uses ip-api.com (free, no key, ~45 req/min). Results are cached per IP for
the process lifetime, so a repeat visitor costs one lookup. Private/loopback
addresses and failures resolve to None and are not retried for the cached
negative.
"""
import ipaddress
import logging
import os

import requests

logger = logging.getLogger(__name__)

GEO_URL     = os.getenv("GEO_LOOKUP_URL", "http://ip-api.com/json")
GEO_TIMEOUT = float(os.getenv("GEO_LOOKUP_TIMEOUT", "2.5"))
GEO_ENABLED = os.getenv("GEO_LOOKUP_ENABLED", "true").lower() == "true"

# ip -> country code ("ID") or None. None means "looked up, no result".
_cache: dict[str, str | None] = {}


def _is_public(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return not (addr.is_private or addr.is_loopback or addr.is_link_local
                or addr.is_multicast or addr.is_reserved or addr.is_unspecified)


def lookup_country(ip: str | None) -> str | None:
    """Return an ISO country code for the IP, or None. Cached per IP."""
    if not ip or not GEO_ENABLED or not _is_public(ip):
        return None
    if ip in _cache:
        return _cache[ip]

    country = None
    try:
        r = requests.get(f"{GEO_URL}/{ip}",
                         params={"fields": "status,countryCode"},
                         timeout=GEO_TIMEOUT)
        if r.ok:
            data = r.json()
            if data.get("status") == "success":
                country = data.get("countryCode") or None
    except Exception as e:
        logger.debug("geo lookup failed for %s: %s", ip, e)

    _cache[ip] = country
    return country
