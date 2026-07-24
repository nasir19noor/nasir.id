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

# --- Tool guardrails ---
SHELL_ALLOWLIST = [
    c.strip()
    for c in os.getenv(
        "SHELL_ALLOWLIST",
        "ls,cat,df,free,uptime,systemctl status,docker ps,docker logs,git status,git log,tail",
    ).split(",")
]
