"""GET a URL. Handy for uptime checks against your own endpoints (e.g. behind
Cloudflare) or reading a JSON API."""
import requests
from agent.tools.base import Tool


class HttpFetchTool(Tool):
    name = "http_fetch"
    description = "Fetch a URL over HTTP GET. Returns status code and body preview."
    input_schema = {
        "type": "object",
        "properties": {"url": {"type": "string", "description": "The URL to fetch."}},
        "required": ["url"],
    }

    def run(self, url: str) -> str:
        try:
            r = requests.get(url, timeout=15)
            return f"Status {r.status_code}\n{r.text[:3000]}"
        except Exception as e:
            return f"Error: {e}"
