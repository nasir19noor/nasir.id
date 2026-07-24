# agent.nasir.id — infrastructure copilot

A read-only agent on **AWS Bedrock (Claude)** that inspects your Contabo VPS,
AWS account, and PostgreSQL. Built to slot into the `nasir.id` monorepo and
deploy through the same self-hosted runner pattern as iTung.

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
          │                                │
          └──── fetch SSE ─────────────────┤
                                           ├──► Bedrock Converse (Claude)
                                           ├──► PostgreSQL  (memory)
                                           ├──► boto3       (EC2/S3/CloudWatch)
                                           └──► shell       (allowlisted)
```

The backend runs with `--network host` so it reaches the VPS PostgreSQL on
`localhost:5432` and can inspect the host directly. The frontend is a normal
published-port container.

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

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | liveness + Bedrock model + memory status |
| GET | `/tools` | what the agent can do |
| POST | `/chat` | run the loop, return the final answer |
| POST | `/chat/stream` | run the loop, stream every step as SSE |
| GET | `/conversations/{id}` | replay a stored conversation |

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

Adding a tool: drop a class in `backend/agent/tools/`, register it in
`tools/__init__.py`. Bedrock is told about it automatically.

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

### 4. Upload the backend `.env` to S3
The workflow pulls it at deploy time, same as iTung.
```bash
aws s3 cp apps/agent/backend/.env s3://agent.nasir.id/backend/.env
```
Contents: see `backend/.env.example`.

### 5. GitHub secret
Only `SSH_PASSWORD` is needed (for `sudo -S`), matching your existing workflows.

### 6. DNS + nginx
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

### 7. Deploy
Push to `main` touching `apps/agent/**`, or run the workflow manually. The
`nasir-contabo` runner rebuilds and restarts only the side that changed.

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

IAM is the real boundary — it grants only `Describe*`/`List*` and Bedrock
invoke. The code-level guards (shell allowlist, SELECT-only SQL) are the second
layer, and the system prompt tells the model to print destructive commands for a
human rather than run them.

`COPY ... FROM PROGRAM` is explicitly refused by the SQL guard.

Before adding any write capability: widen IAM deliberately, and put the action
behind an explicit human confirmation step in the UI.
