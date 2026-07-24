# Nasir Infra Copilot — an agentic AI on your own infrastructure

A read-only "infrastructure copilot" agent built on **AWS Bedrock (Claude)**,
running on your **Contabo VPS**, remembering state in your **PostgreSQL**,
inspecting your **AWS account**, and deployed by your **GitHub Actions
self-hosted runner**.

It is deliberately built *from scratch* (no agent framework) so every part of
the loop is visible and yours to extend.

---

## How your infrastructure maps to the agent

| Your setup | Role in the agent | File |
| --- | --- | --- |
| Bedrock + Claude | Reasoning engine (Converse API, native tool use) | `agent/bedrock_client.py` |
| PostgreSQL on VPS | Memory — conversations + tool history | `agent/memory.py`, `db/schema.sql` |
| AWS account | Tools — read-only EC2 / S3 / CloudWatch | `agent/tools/aws_tools.py` |
| VPS | Tools — allowlisted shell, and where it runs | `agent/tools/shell.py` |
| GitHub Actions + runner | CI/CD that redeploys on push to `main` | `.github/workflows/deploy.yml` |
| Cloudflare | DNS in front of the agent's HTTP API | (point a record at VPS:8000) |

## The agent loop (the important part)

`agent/core.py`:

```
user message
  -> Bedrock: answer directly OR request tool calls
  -> if tools: run them, feed results back, ask Bedrock again
  -> repeat until no more tools are requested (or MAX_AGENT_STEPS)
```

That single `while` loop *is* what makes this "agentic" — the model chooses
which tools to use and when it's done.

---

## Setup

### 1. Enable Bedrock model access
In the AWS console (region `ap-southeast-1`): **Bedrock -> Model access ->
enable the Claude model** you want. Then open **Model catalog** and copy the
exact **model ID or inference profile** (APAC profiles are prefixed `apac.`).
Put it in `.env` as `BEDROCK_MODEL_ID`.

> Model IDs change over time — always confirm the current one in the console
> rather than trusting a hard-coded default.

### 2. Create the IAM user (Terraform)
```bash
cd terraform
terraform init
terraform apply
terraform output access_key_id
terraform output -raw secret_access_key
```
Put those keys in `.env`.

### 3. Prepare PostgreSQL (already on your VPS)
```bash
createdb agent           # or reuse an existing DB
psql "$DATABASE_URL" -f db/schema.sql
```

### 4. Configure and run
```bash
cp .env.example .env      # fill in the values
pip install -r requirements.txt
python main.py            # interactive CLI to test locally
```

Try:
- `How much disk is free on the VPS?`
- `List my S3 buckets and EC2 instances.`
- `Show the last 20 events from log group /aws/lambda/my-fn.`
- `How many rows are in the messages table?`

### 5. Deploy on the VPS
The self-hosted runner does this automatically on push to `main`:
```bash
docker compose up -d --build   # what the workflow runs
curl http://localhost:8000/health
```
Then add a Cloudflare DNS record (e.g. `agent.nasir.id`) pointing at the VPS,
and put a reverse proxy / TLS in front of port 8000.

---

## Safety model

- **Shell** is limited to an allowlist of read-only command prefixes (`SHELL_ALLOWLIST`).
- **SQL** accepts `SELECT` only; write/DDL keywords are refused before hitting the DB.
- **AWS** IAM grants only `Describe*` / `List*` / log reads — no mutations.
- The system prompt tells the model to describe destructive commands for a
  human to run rather than attempting them.

Treat this as defence in depth: the IAM policy is the real boundary; the code
checks are a friendly second layer.

---

## Where to go next

1. **Add tools** — drop a class in `agent/tools/`, register it in
   `agent/tools/__init__.py`. That's the whole wiring.
2. **RAG (Phase 5)** — enable `pgvector`, embed your runbooks/Terraform docs,
   add a `search_docs` tool so the agent answers with *your* context.
3. **Streaming** — switch `converse` to `converse_stream` for token-by-token output.
4. **MCP** — wrap these tools as a Model Context Protocol server so Claude Code
   and the desktop app can use them too.
5. **Write actions** — add mutating tools *only* behind an explicit human
   confirmation step, and widen the IAM policy deliberately.
