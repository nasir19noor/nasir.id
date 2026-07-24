"""Read-only shell access to the VPS, gated by an allowlist of command prefixes.
This is how the agent inspects the box the GitHub runner and apps live on."""
import subprocess
from config import SHELL_ALLOWLIST
from agent.tools.base import Tool


class ShellTool(Tool):
    name = "run_shell"
    description = (
        "Run a read-only shell command on the VPS. Only allowlisted commands are "
        "permitted (e.g. ls, cat, df, free, uptime, systemctl status, docker ps, "
        "git status, git log, tail). Use to inspect disk, services, and containers."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "command": {"type": "string", "description": "The shell command to run."}
        },
        "required": ["command"],
    }

    def _allowed(self, command: str) -> bool:
        cmd = command.strip()
        return any(cmd.startswith(p) for p in SHELL_ALLOWLIST)

    def run(self, command: str) -> str:
        if not self._allowed(command):
            return f"Refused: '{command}' is not in the allowlist."
        try:
            result = subprocess.run(
                command, shell=True, capture_output=True, text=True, timeout=30
            )
            out = (result.stdout or "") + (result.stderr or "")
            return out.strip()[:4000] or "(no output)"
        except subprocess.TimeoutExpired:
            return "Error: command timed out after 30s."
        except Exception as e:
            return f"Error: {e}"
