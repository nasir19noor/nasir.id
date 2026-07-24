"""Read-only shell on the VPS, gated by an allowlist of command prefixes."""
import subprocess
from config import SHELL_ALLOWLIST
from agent.tools.base import Tool

_BLOCKED_CHARS = (";", "&&", "||", "|", ">", "<", "`", "$(")


class ShellTool(Tool):
    name = "run_shell"
    description = (
        "Run a read-only shell command on the Contabo VPS. Only allowlisted "
        "commands are permitted: ls, cat, df, free, uptime, systemctl status, "
        "docker ps, docker logs, git status, git log, tail. Use for disk usage, "
        "running containers, service health, and log inspection."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "command": {"type": "string", "description": "The command to run."}
        },
        "required": ["command"],
    }

    def run(self, command: str) -> str:
        cmd = command.strip()
        if any(ch in cmd for ch in _BLOCKED_CHARS):
            return "Refused: shell metacharacters and chaining are not allowed."
        if not any(cmd.startswith(p) for p in SHELL_ALLOWLIST):
            return f"Refused: '{cmd}' is not in the allowlist."
        try:
            result = subprocess.run(
                cmd, shell=True, capture_output=True, text=True, timeout=30
            )
            out = (result.stdout or "") + (result.stderr or "")
            return out.strip()[:4000] or "(no output)"
        except subprocess.TimeoutExpired:
            return "Error: command timed out after 30s."
        except Exception as e:
            return f"Error: {e}"
