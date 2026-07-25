"""One-time OAuth flow to mint a Google Drive refresh token for the agent.

    python scripts/google_drive_oauth_setup.py [login_hint_email]

Before running this:
  1. In https://console.cloud.google.com, create/select a project, enable the
     "Google Drive API" (APIs & Services > Library), then create an OAuth
     client ID (APIs & Services > Credentials) of type "Desktop app".
  2. Put that client's ID and secret in .env as GOOGLE_OAUTH_CLIENT_ID and
     GOOGLE_OAUTH_CLIENT_SECRET.
  3. Run this script. It opens a browser for you to sign in and grant
     read-only Drive access, catches the redirect on localhost, exchanges the
     code for tokens, and prints a refresh_token to paste into .env as
     GOOGLE_DRIVE_REFRESH_TOKEN.

The refresh token doesn't expire on its own, so this is a one-time step per
account. Pass the account's email as an argument to pre-fill the Google login
screen (e.g. nasir19noor@gmail.com) -- it's just a UX hint, not enforced.
"""
import os
import sys
import time
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs, urlencode

import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET  # noqa: E402

REDIRECT_URI = "http://localhost:8765/"
SCOPE = "https://www.googleapis.com/auth/drive.readonly"

_result = {}


class _CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        params = parse_qs(urlparse(self.path).query)
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        if "code" in params:
            _result["code"] = params["code"][0]
            self.wfile.write(b"Got it -- you can close this tab and return to the terminal.")
        else:
            _result["error"] = params.get("error", ["unknown error"])[0]
            self.wfile.write(b"Authorization failed -- check the terminal.")

    def log_message(self, *args):
        pass  # keep stdout clean; the script prints its own status


def main():
    if not GOOGLE_OAUTH_CLIENT_ID or not GOOGLE_OAUTH_CLIENT_SECRET:
        print("Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in .env first.")
        print("Create them at https://console.cloud.google.com -> APIs & Services -> Credentials.")
        return 1

    login_hint = sys.argv[1] if len(sys.argv) > 1 else ""

    server = HTTPServer(("localhost", 8765), _CallbackHandler)
    threading.Thread(target=server.handle_request, daemon=True).start()

    auth_params = {
        "client_id": GOOGLE_OAUTH_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",
    }
    if login_hint:
        auth_params["login_hint"] = login_hint
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(auth_params)

    print(f"Opening a browser to sign in{f' as {login_hint}' if login_hint else ''}...")
    print(f"If it doesn't open, visit:\n  {auth_url}\n")
    webbrowser.open(auth_url)

    print("Waiting for the redirect on http://localhost:8765/ ...")
    while not _result:
        time.sleep(0.1)

    if "error" in _result:
        print(f"Google returned an error: {_result['error']}")
        return 1

    resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": _result["code"],
            "client_id": GOOGLE_OAUTH_CLIENT_ID,
            "client_secret": GOOGLE_OAUTH_CLIENT_SECRET,
            "redirect_uri": REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=15,
    )
    if resp.status_code >= 400:
        print(f"Token exchange failed: {resp.status_code} {resp.text}")
        return 1

    refresh_token = resp.json().get("refresh_token")
    if not refresh_token:
        print(
            "No refresh_token in the response -- Google only issues one the first\n"
            "time you consent for a given client. Revoke this app's access at\n"
            "https://myaccount.google.com/permissions and re-run this script."
        )
        return 1

    print("\nSuccess. Add this to .env:\n")
    print(f"GOOGLE_DRIVE_REFRESH_TOKEN={refresh_token}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
