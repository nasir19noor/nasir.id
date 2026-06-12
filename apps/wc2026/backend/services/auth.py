"""HTTP Basic auth for the /admin/* endpoints.

Credentials live in env (ADMIN_USERNAME / ADMIN_PASSWORD) — no DB users,
no token store. The frontend's /admin page collects them in a login form
and sends them as `Authorization: Basic <b64>` on every admin call.
"""
import os
import secrets
import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

logger = logging.getLogger(__name__)

_basic = HTTPBasic(auto_error=False)


def require_admin(credentials: HTTPBasicCredentials | None = Depends(_basic)) -> str:
    """Allow the request only if Basic auth matches ADMIN_USERNAME/PASSWORD."""
    admin_user = os.getenv("ADMIN_USERNAME", "").strip()
    admin_pass = os.getenv("ADMIN_PASSWORD", "").strip()

    if not admin_user or not admin_pass:
        # Don't quietly allow access when the server is misconfigured.
        logger.error("ADMIN_USERNAME / ADMIN_PASSWORD not set in env")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin authentication is not configured.",
        )

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Basic"},
        )

    user_ok = secrets.compare_digest(credentials.username, admin_user)
    pass_ok = secrets.compare_digest(credentials.password, admin_pass)
    if not (user_ok and pass_ok):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username
