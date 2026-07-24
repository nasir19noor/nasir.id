"""HTTP Basic auth for every endpoint except /health.

Credentials live in env (AUTH_USERNAME / AUTH_PASSWORD) — no DB users, no
token store. The frontend collects them in a login form once and sends them
as `Authorization: Basic <b64>` on every call.

This agent can run shell commands and query production data, so every
sensitive route must be gated — there is no "read-only from the outside"
tier, since even reads leak infrastructure detail an unauthenticated caller
should never see.
"""
import secrets
import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from config import AUTH_USERNAME, AUTH_PASSWORD

logger = logging.getLogger(__name__)

_basic = HTTPBasic(auto_error=False)


def require_auth(credentials: HTTPBasicCredentials | None = Depends(_basic)) -> str:
    """Allow the request only if Basic auth matches AUTH_USERNAME/PASSWORD."""
    if not AUTH_USERNAME or not AUTH_PASSWORD:
        # Don't quietly allow access when the server is misconfigured.
        logger.error("AUTH_USERNAME / AUTH_PASSWORD not set in env")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication is not configured.",
        )

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Basic"},
        )

    user_ok = secrets.compare_digest(credentials.username, AUTH_USERNAME)
    pass_ok = secrets.compare_digest(credentials.password, AUTH_PASSWORD)
    if not (user_ok and pass_ok):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username
