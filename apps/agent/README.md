# agent.nasir.id — infrastructure copilot

An agent on **AWS Bedrock (Claude)** that inspects your Contabo VPS, AWS
account, PostgreSQL, GitHub, and Google Drive — and can create GitHub repos.
Built to slot into the `nasir.id` monorepo and deploy through the same
self-hosted runner pattern as iTung. Protected end-to-end by HTTP Basic Auth;
nothing but `/health` is reachable without credentials.

```
apps/agent/
├── backend/     FastAPI  · api.agent.nasir.id · :9003 · --network host
└── frontend/    Astro    · agent.nasir.id     · :5003 · -p 5003:5003
```

---

## Architecture

```
                    Cloudflare DNS
                          │
          ┌───────────────┴────────────────┐
          ▼                                ▼
  agent.nasir.id                  api.agent.nasir.id
          │                                │
      nginx :443                       nginx :443
          │                                │  (proxy_buffering off — SSE)
          ▼                                ▼
  agent-frontend :5003            agent-backend :9003
  Astro node standalone           FastAPI + uvicorn
  (login gate, sessionStorage)    (HTTP Basic Auth on every route but /health)
          │                                │
          └──── fetch SSE ─────────────────┤
                                           ├──► Bedrock Converse (Claude)
                                           ├──► PostgreSQL  (memory)
                                           ├──► boto3       (EC2/S3/CloudWatch)
                                           ├──► shell       (allowlisted)
                                           ├──► GitHub REST API (PAT)
                                           └──► Google Drive API (OAuth refresh token)
```

The backend runs with `--network host` so it reaches the VPS PostgreSQL on
`localhost:5432` and can inspect the host directly. The frontend is a normal
published-port container.

## Authentication

Every endpoint except `GET /health` requires **HTTP Basic Auth**
(`backend/auth.py`, `Depends(require_auth)` per-route — not global
middleware, so health checks stay unauthenticated). Credentials live in
`backend/.env` as `AUTH_USERNAME` / `AUTH_PASSWORD`. If either is unset the
backend fails closed (500), rather than silently allowing access.

The frontend ([index.astro](frontend/src/pages/index.astro)) shows a login
gate on load, validates the entered credentials with a cheap authenticated
`GET /tools` call, and stores the Basic Auth token in **`sessionStorage`**
only (never `localStorage`, never cookies — gone when the tab closes). A 401
from `/chat/stream` clears the token and reopens the gate with "Session
expired."

## Memory

Every message — user text, assistant text/tool-use, tool results — is saved
to PostgreSQL as it happens (`backend/agent/memory.py`, JSONB in exactly the
shape Bedrock expects, via `Agent._add()`). Memory is best-effort: if
Postgres is down the agent still answers, it just won't remember. `db/schema.sql`
has the table definitions.

The frontend ([index.astro](frontend/src/pages/index.astro)) persists
`conversation_id` in `sessionStorage` and, on load or login, fetches
`GET /conversations/{id}` and replays the stored messages back into the log
instead of starting a new conversation. This is what makes the Postgres
memory actually pay off: reusing an existing `conversation_id` costs nothing
extra — the backend reloads its full history before the first Bedrock call
either way — while silently starting a new one throws that context away and
makes the model re-earn it, burning Bedrock tokens for no reason. Click
"new" in the header to deliberately start a clean conversation.

## The agent loop

`backend/agent/core.py` — no framework, just a loop you can read:

```
user message
  → Bedrock: answer, or request tool calls
  → run the tools, feed results back, ask again
  → repeat until no tools are requested (or MAX_AGENT_STEPS)
```

`run_stream()` yields one event per step, which the API re-emits as SSE, which
the frontend draws as a live trace. You watch the agent think.

## API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | none | liveness + Bedrock model + memory status |
| GET | `/tools` | required | what the agent can do |
| POST | `/chat` | required | run the loop, return the final answer |
| POST | `/chat/stream` | required | run the loop, stream every step as SSE |
| GET | `/conversations/{id}` | required | replay a stored conversation |

SSE event types: `start`, `text`, `tool_use`, `tool_result`, `done`, `error`, `end`.

```
data: {"type":"tool_use","step":1,"id":"tu_1","name":"run_shell","input":{"command":"uptime"}}

data: {"type":"tool_result","step":1,"id":"tu_1","name":"run_shell","output":"...","ms":4}
```

## Tools

| Tool | Reaches | Guard |
| --- | --- | --- |
| `run_shell` | VPS | prefix allowlist, no metacharacters or chaining |
| `query_postgres` | VPS PostgreSQL | `SELECT` only, keyword denylist |
| `list_ec2_instances` | AWS | IAM `ec2:Describe*` |
| `list_s3_buckets` | AWS | IAM `s3:ListAllMyBuckets` |
| `tail_cloudwatch_logs` | AWS | IAM `logs:FilterLogEvents` |
| `http_fetch` | anywhere | GET only |
| `list_github_repos` | GitHub | read-only PAT |
| `list_github_issues` | GitHub | read-only PAT |
| `list_github_pull_requests` | GitHub | read-only PAT |
| `list_github_actions_runs` | GitHub | read-only PAT |
| `list_github_commits` | GitHub | read-only PAT |
| `create_github_repo` | GitHub | **write** — needs a `repo`/`public_repo`-scoped PAT (or fine-grained "Administration: read and write") |
| `search_google_drive` | Google Drive (`nasir19noor@gmail.com` only) | read-only OAuth scope, refresh token |
| `read_google_drive_file` | Google Drive (`nasir19noor@gmail.com` only) | read-only; refuses binary files (PDF/image/video/audio) |

Adding a tool: drop a class in `backend/agent/tools/`, register it in
`tools/__init__.py`. Bedrock is told about it automatically.

`create_github_repo` is the only tool in this app that mutates external state
— see [Safety](#safety).

---

## Setup

### 1. Bedrock model access
Console → **Bedrock → Model access** (region `ap-southeast-1`) → enable Claude.
Then **Model catalog** → copy the exact model ID or inference profile. APAC
cross-region profiles are prefixed `apac.`. Model IDs change — confirm rather
than trusting the default in `config.py`.

### 2. IAM user
```bash
cd deploy && terraform init && terraform apply
terraform output access_key_id
terraform output -raw secret_access_key
```

### 3. Database
```bash
sudo -u postgres createdb agent
psql "$DATABASE_URL" -f apps/agent/backend/db/schema.sql
```

### 4. Auth credentials
Set `AUTH_USERNAME` / `AUTH_PASSWORD` in `backend/.env`. The whole app is
unreachable (except `/health`) without these.

### 5. GitHub tools (optional)
Create a PAT (Settings → Developer settings) and set `GITHUB_TOKEN` in
`backend/.env`:
- Inspection only (issues/PRs/Actions/commits/repo listing): fine-grained PAT
  with read-only Issues, Pull requests, Actions, Contents.
- To also allow `create_github_repo`: classic PAT with `repo` (private) or
  `public_repo` (public-only) scope, or a fine-grained PAT with
  "Administration: read and write" under Account permissions.

Leave blank to disable the GitHub tools — they return a clear "not
configured" message instead of failing.

### 6. Google Drive tool (optional, `nasir19noor@gmail.com` only)
1. [Google Cloud Console](https://console.cloud.google.com) → enable the
   **Google Drive API** → create an **OAuth client ID** (type "Desktop app").
2. Put the client id/secret in `backend/.env` as `GOOGLE_OAUTH_CLIENT_ID` /
   `GOOGLE_OAUTH_CLIENT_SECRET`.
3. Run the one-time consent flow:
   ```bash
   cd apps/agent/backend
   python scripts/google_drive_oauth_setup.py nasir19noor@gmail.com
   ```
   This opens a browser, catches the redirect on `localhost:8765`, and
   prints a `GOOGLE_DRIVE_REFRESH_TOKEN=...` line to paste into `.env`.

Leave any of the three Google vars blank to disable the Drive tools.

### 7. Upload the backend `.env` to S3
The workflow pulls it at deploy time, same as iTung.
```bash
aws s3 cp apps/agent/backend/.env s3://agent.nasir.id/backend/.env
```
Contents: see `backend/.env.example`.

### 8. GitHub Actions secret
Only `SSH_PASSWORD` is needed (for `sudo -S`), matching your existing workflows.

### 9. DNS + nginx
Cloudflare A records → VPS IP:
- `agent.nasir.id`
- `api.agent.nasir.id`

Then:
```bash
sudo cp deploy/nginx-agent.conf /etc/nginx/sites-available/agent.nasir.id
sudo ln -s /etc/nginx/sites-available/agent.nasir.id /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

> The `api.` server block sets `proxy_buffering off`. Without it nginx buffers
> the SSE stream and the trace appears all at once at the end.

### 10. Deploy
Push to `main` touching `apps/agent/**`, or run the workflow manually. The
`nasir-contabo` runner rebuilds and restarts only the side that changed.

## TODO — activate Google Drive (pending, on you)

The Drive tools are built and registered, but not usable yet — this part
genuinely requires your action, same as the GitHub PAT did:

1. In [Google Cloud Console](https://console.cloud.google.com) → APIs &
   Services → Library, enable the **Google Drive API**.
2. APIs & Services → Credentials → create an **OAuth client ID**, type
   **Desktop app**.
3. Paste that client's ID and secret into `backend/.env` as
   `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`.
4. Run `python scripts/google_drive_oauth_setup.py nasir19noor@gmail.com`
   from `backend/` — sign in as that account, grant read-only Drive access,
   and it'll print `GOOGLE_DRIVE_REFRESH_TOKEN=...` to paste into `.env`.

Note: without a browser in the dev environment the consent flow couldn't be
run, so the Drive API field names (`id`/`name`/`mimeType`/`modifiedTime`/
`webViewLink`, and the `files.export`/`alt=media` endpoints) are from Drive
API v3's stable documented schema but are **unverified against a live
response** — worth a sanity check once the token is in place.

## Local development

```bash
# backend
cd apps/agent/backend
pip install -r requirements.txt
cp .env.example .env         # fill in
uvicorn main:app --reload --port 9003

# frontend
cd apps/agent/frontend
npm install
PUBLIC_API_URL=http://localhost:9003 npm run dev
```

## Safety

IAM is the real boundary for the AWS tools — it grants only
`Describe*`/`List*` and Bedrock invoke. The code-level guards (shell
allowlist, SELECT-only SQL) are the second layer, and the system prompt tells
the model to print destructive commands for a human rather than run them.

`COPY ... FROM PROGRAM` is explicitly refused by the SQL guard.

For GitHub and Google Drive there is no IAM — **the PAT/OAuth scope is the
entire boundary.** `create_github_repo` is a real write action (it creates
the repo, it doesn't ask for confirmation itself); it only works at all if
you deliberately hand the app a write-scoped GitHub token. The Google Drive
tools are read-only by design (`drive.readonly` OAuth scope) and refuse to
return binary file content.

Before adding any further write capability (Drive file creation/edits, a
second Google account, etc.): scope the credential deliberately, and put the
action behind an explicit human confirmation step in the UI if it's
destructive or hard to reverse.

---

## Changelog

A running summary of notable capability changes — kept up to date as the
agent grows.

- **2026-07-25 — Frontend now resumes conversations instead of discarding them**
  The backend already reloaded full history from Postgres for a given
  `conversation_id` (`agent/core.py`), but the frontend never persisted that
  id anywhere — every page reload silently started a brand-new conversation,
  throwing the stored context away and forcing the model to re-earn it
  (extra Bedrock calls/tokens for no reason). Fixed in
  [index.astro](frontend/src/pages/index.astro): `conversation_id` is now
  kept in `sessionStorage`, and on load/login the app fetches
  `GET /conversations/{id}` and replays it into the log instead of starting
  fresh. Added a "new" button in the header for when you actually want a
  clean conversation.
- **2026-07-25 — Google Drive tool (read-only, `nasir19noor@gmail.com`)**
  Added `search_google_drive` and `read_google_drive_file`
  (`backend/agent/tools/google_drive_tools.py`), OAuth2 refresh-token auth
  (`GOOGLE_OAUTH_CLIENT_ID`/`SECRET`/`GOOGLE_DRIVE_REFRESH_TOKEN`), and a
  one-time setup script (`scripts/google_drive_oauth_setup.py`). Scoped to
  one personal account for now; the `cloud-kinetics.com` Workspace account
  was deliberately deferred.
- **2026-07-25 — GitHub write tool: `create_github_repo`**
  First mutating tool in the app. Requires upgrading `GITHUB_TOKEN` to a
  write-scoped PAT (`repo`/`public_repo`, or fine-grained "Administration:
  read and write").
- **2026-07-25 — GitHub repo listing: `list_github_repos`**
  Lists repos for the token's own account or a given owner, sorted by most
  recently pushed — answers "how many repos / which is most active."
- **2026-07-19 — GitHub tools (read-only)**
  Added `list_github_issues`, `list_github_pull_requests`,
  `list_github_actions_runs`, `list_github_commits`
  (`backend/agent/tools/github_tools.py`), gated on `GITHUB_TOKEN`.
- **2026-07-19 — Authentication**
  Added HTTP Basic Auth (`backend/auth.py`) on every route except `/health`,
  `AUTH_USERNAME`/`AUTH_PASSWORD` in `backend/.env`, and a frontend login
  gate with `sessionStorage`-only credential storage. Before this the app
  (shell access, DB queries, AWS inspection) had no authentication at all.
