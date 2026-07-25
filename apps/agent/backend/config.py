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

# --- GitHub (read-only inspection tools) ---
# A fine-grained PAT with read-only access (Issues, Pull requests, Actions,
# Contents) to whichever repos you want the agent to inspect. Classic PATs
# with the `repo` (private) or `public_repo` (public-only) scope also work.
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

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
