"""Read-only Google Drive inspection for nasir19noor@gmail.com. Plain
`requests`, same convention as github_tools.py. Needs GOOGLE_OAUTH_CLIENT_ID,
GOOGLE_OAUTH_CLIENT_SECRET and GOOGLE_DRIVE_REFRESH_TOKEN in env (see
scripts/google_drive_oauth_setup.py to mint the refresh token); every tool
refuses cleanly if they're not set rather than raising."""
import requests
from config import (
    GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET,
    GOOGLE_DRIVE_REFRESH_TOKEN,
)
from agent.tools.base import Tool

_TOKEN_URL = "https://oauth2.googleapis.com/token"
_API = "https://www.googleapis.com/drive/v3"
_MAX_CHARS = 4000

# Google-native formats have no raw bytes to download -- they must be
# exported to a plain format first. Everything else (txt, code, json, etc.)
# is fetched directly with alt=media.
_EXPORT_MIME = {
    "application/vnd.google-apps.document": "text/plain",
    "application/vnd.google-apps.spreadsheet": "text/csv",
    "application/vnd.google-apps.presentation": "text/plain",
}
_BINARY_PREFIXES = ("image/", "video/", "audio/")
_BINARY_MIMES = {"application/pdf", "application/zip", "application/octet-stream"}


def _not_configured() -> str | None:
    if not (GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET and GOOGLE_DRIVE_REFRESH_TOKEN):
        return (
            "Error: Google Drive is not configured. Set GOOGLE_OAUTH_CLIENT_ID, "
            "GOOGLE_OAUTH_CLIENT_SECRET and GOOGLE_DRIVE_REFRESH_TOKEN "
            "(run scripts/google_drive_oauth_setup.py to get the refresh token)."
        )
    return None


def _access_token() -> tuple[str | None, str | None]:
    """Exchange the long-lived refresh token for a short-lived access token."""
    try:
        r = requests.post(
            _TOKEN_URL,
            data={
                "client_id": GOOGLE_OAUTH_CLIENT_ID,
                "client_secret": GOOGLE_OAUTH_CLIENT_SECRET,
                "refresh_token": GOOGLE_DRIVE_REFRESH_TOKEN,
                "grant_type": "refresh_token",
            },
            timeout=15,
        )
    except Exception as e:
        return None, f"Error: {e}"
    if r.status_code >= 400:
        try:
            msg = r.json().get("error_description", r.text[:200])
        except Exception:
            msg = r.text[:200]
        return None, f"Error: Google token refresh failed ({r.status_code}) — {msg}"
    return r.json()["access_token"], None


def _drive_get(path: str, params: dict | None = None, raw: bool = False):
    """GET the Drive API. Returns (body, None) on success, (None, error) on
    failure. body is parsed JSON unless raw=True, in which case it's text."""
    cfg_err = _not_configured()
    if cfg_err:
        return None, cfg_err
    token, err = _access_token()
    if err:
        return None, err
    try:
        r = requests.get(
            f"{_API}{path}",
            headers={"Authorization": f"Bearer {token}"},
            params=params,
            timeout=15,
        )
    except Exception as e:
        return None, f"Error: {e}"
    if r.status_code >= 400:
        try:
            msg = r.json().get("error", {}).get("message", r.text[:200])
        except Exception:
            msg = r.text[:200]
        return None, f"Error: Drive API {r.status_code} — {msg}"
    return (r.text if raw else r.json()), None


class SearchGoogleDriveTool(Tool):
    name = "search_google_drive"
    description = (
        "Search or list files in nasir19noor@gmail.com's Google Drive by name "
        "or content. Returns each file's id, name, type, and last-modified "
        "time -- use the id with read_google_drive_file to fetch contents."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Text to search for in file names/content. Omit to list "
                "recently modified files instead.",
            },
            "limit": {"type": "integer", "description": "Max files, default 20, max 100."},
        },
        "required": [],
    }

    def run(self, query: str = "", limit: int = 20) -> str:
        q = "trashed = false"
        if query:
            escaped = query.replace("\\", "\\\\").replace("'", "\\'")
            q = f"fullText contains '{escaped}' and {q}"
        params = {
            "q": q,
            "pageSize": min(max(limit, 1), 100),
            "orderBy": "modifiedTime desc",
            "fields": "files(id,name,mimeType,modifiedTime,webViewLink)",
        }
        data, err = _drive_get("/files", params)
        if err:
            return err
        lines = [
            f"{f['id']} — {f['name']} ({f['mimeType']}) — modified {f['modifiedTime']} — "
            f"{f.get('webViewLink', '')}"
            for f in data.get("files", [])
        ]
        return ("\n".join(lines) or "No files found.")[:_MAX_CHARS]


class ReadGoogleDriveFileTool(Tool):
    name = "read_google_drive_file"
    description = (
        "Read the text content of a Google Drive file by its id (from "
        "search_google_drive). Google Docs/Sheets/Slides are exported as "
        "plain text/CSV; other text-like files (txt, code, json, etc.) are "
        "read directly. Binary files such as images or PDFs are refused."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "file_id": {"type": "string", "description": "The Drive file id."},
        },
        "required": ["file_id"],
    }

    def run(self, file_id: str) -> str:
        meta, err = _drive_get(f"/files/{file_id}", {"fields": "name,mimeType"})
        if err:
            return err
        mime = meta["mimeType"]

        export_as = _EXPORT_MIME.get(mime)
        if export_as:
            content, err = _drive_get(
                f"/files/{file_id}/export", {"mimeType": export_as}, raw=True
            )
        elif mime.startswith("application/vnd.google-apps."):
            return f"Refused: {meta['name']} is a {mime} file, which isn't exportable to text."
        elif mime.startswith(_BINARY_PREFIXES) or mime in _BINARY_MIMES:
            return f"Refused: {meta['name']} is a {mime} file — binary content isn't supported."
        else:
            content, err = _drive_get(f"/files/{file_id}", {"alt": "media"}, raw=True)

        if err:
            return err
        return content[:_MAX_CHARS]
