"""Resolve a public IP to geo detail, with an in-memory cache.

Uses ip-api.com (free, no key, ~45 req/min). Results are cached per IP for
the process lifetime, so a repeat visitor costs one lookup. Private/loopback
addresses and failures resolve to an empty dict and are not retried.
"""
import ipaddress
import logging
import os

import requests

logger = logging.getLogger(__name__)

GEO_URL     = os.getenv("GEO_LOOKUP_URL", "http://ip-api.com/json")
GEO_TIMEOUT = float(os.getenv("GEO_LOOKUP_TIMEOUT", "2.5"))
GEO_ENABLED = os.getenv("GEO_LOOKUP_ENABLED", "true").lower() == "true"

# Fields we pull from ip-api (https://ip-api.com/docs/api:json).
_FIELDS = "status,country,countryCode,regionName,city,zip,lat,lon,timezone,isp"

# ip -> geo dict (possibly empty). An entry that exists means "already looked up".
_cache: dict[str, dict] = {}


def _is_public(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return not (addr.is_private or addr.is_loopback or addr.is_link_local
                or addr.is_multicast or addr.is_reserved or addr.is_unspecified)


def lookup_geo(ip: str | None) -> dict:
    """
    Return a dict with geo detail for the IP, or {} if unavailable.

    Keys (when present): country, country_code, region, city, zip,
    lat, lon, timezone, isp.
    """
    if not ip or not GEO_ENABLED or not _is_public(ip):
        return {}
    if ip in _cache:
        return _cache[ip]

    result: dict = {}
    try:
        r = requests.get(f"{GEO_URL}/{ip}", params={"fields": _FIELDS},
                         timeout=GEO_TIMEOUT)
        if r.ok:
            data = r.json()
            if data.get("status") == "success":
                result = {
                    "country":      data.get("country") or None,
                    "country_code": data.get("countryCode") or None,
                    "region":       data.get("regionName") or None,
                    "city":         data.get("city") or None,
                    "zip":          data.get("zip") or None,
                    "lat":          data.get("lat"),
                    "lon":          data.get("lon"),
                    "timezone":     data.get("timezone") or None,
                    "isp":          data.get("isp") or None,
                }
    except Exception as e:
        logger.debug("geo lookup failed for %s: %s", ip, e)

    _cache[ip] = result
    return result


def lookup_country(ip: str | None) -> str | None:
    """Backwards-compatible helper — just the country code."""
    return lookup_geo(ip).get("country_code")
