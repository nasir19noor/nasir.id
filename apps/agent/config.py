"""Central configuration. Everything is env-driven so the same image runs
locally and on the VPS."""
import os
from dotenv import load_dotenv

load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-1")

# Verify this in the Bedrock console -> Model catalog. Model IDs change over
# time and differ by region; APAC inference profiles are prefixed "apac.".
BEDROCK_MODEL_ID = os.getenv(
    "BEDROCK_MODEL_ID", "apac.anthropic.claude-sonnet-4-20250514-v1:0"
)

MAX_TOKENS = int(os.getenv("MAX_TOKENS", "2048"))
MAX_AGENT_STEPS = int(os.getenv("MAX_AGENT_STEPS", "10"))
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://agent:agent@localhost:5432/agent")

# Only commands starting with one of these prefixes may run. Read-only by design.
SHELL_ALLOWLIST = [
    c.strip()
    for c in os.getenv(
        "SHELL_ALLOWLIST",
        "ls,cat,df,free,uptime,systemctl status,docker ps,git status,git log,tail",
    ).split(",")
]
