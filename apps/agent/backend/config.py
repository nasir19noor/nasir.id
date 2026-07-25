"""Env-driven config. In production the .env is pulled from
s3://agent.nasir.id/backend/.env by the deploy workflow."""
import os
from dotenv import load_dotenv

load_dotenv()

# --- Server ---
PORT = int(os.getenv("PORT", "9003"))
# Browser origins allowed to call this API.
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS", "https://agent.nasir.id,http://localhost:5003"
    ).split(",")
    if o.strip()
]

# --- Bedrock ---
AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-1")
# Confirm the exact ID in the Bedrock console -> Model catalog.
# APAC cross-region inference profiles are prefixed "apac.".
BEDROCK_MODEL_ID = os.getenv(
    "BEDROCK_MODEL_ID", "apac.anthropic.claude-sonnet-4-20250514-v1:0"
)
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "2048"))
MAX_AGENT_STEPS = int(os.getenv("MAX_AGENT_STEPS", "10"))

# --- Memory ---
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://agent:agent@localhost:5432/agent")

# --- GitHub (inspection tools + repo creation) ---
# The agent can inspect repos (issues, PRs, Actions, commits) and also create
# new ones. For inspection only, a fine-grained PAT with read-only access
# (Issues, Pull requests, Actions, Contents) is enough. To let it create repos
# too, use a classic PAT with the `repo` (private) or `public_repo`
# (public-only) scope, or a fine-grained PAT with "Administration: read and
# write" under Account permissions.
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

# --- Google Drive (read-only inspection, nasir19noor@gmail.com only) ---
# Needs an OAuth client from https://console.cloud.google.com (APIs & Services
# > Credentials) with the Drive API enabled, plus a refresh token minted once
# via `python scripts/google_drive_oauth_setup.py`. See that script's
# docstring for the full one-time setup steps.
GOOGLE_OAUTH_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "")
GOOGLE_OAUTH_CLIENT_SECRET = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "")
GOOGLE_DRIVE_REFRESH_TOKEN = os.getenv("GOOGLE_DRIVE_REFRESH_TOKEN", "")

# --- Auth ---
# HTTP Basic auth, required on every endpoint except /health. This agent can
# run shell commands and query production data, so it must never be reachable
# without credentials.
AUTH_USERNAME = os.getenv("AUTH_USERNAME", "")
AUTH_PASSWORD = os.getenv("AUTH_PASSWORD", "")

# --- Tool guardrails ---
SHELL_ALLOWLIST = [
    c.strip()
    for c in os.getenv(
        "SHELL_ALLOWLIST",
        "ls,cat,df,free,uptime,systemctl status,docker ps,docker logs,git status,git log,tail",
    ).split(",")
]
