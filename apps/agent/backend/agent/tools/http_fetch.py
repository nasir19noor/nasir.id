"""HTTP GET, for uptime checks against your own endpoints behind Cloudflare."""
import requests
from agent.tools.base import Tool


class HttpFetchTool(Tool):
    name = "http_fetch"
    description = "HTTP GET a URL. Returns the status code and a body preview."
    input_schema = {
        "type": "object",
        "properties": {"url": {"type": "string", "description": "URL to fetch."}},
        "required": ["url"],
    }

    def run(self, url: str) -> str:
        try:
            r = requests.get(url, timeout=15)
            return f"Status {r.status_code}\n{r.text[:3000]}"
        except Exception as e:
            return f"Error: {e}"
