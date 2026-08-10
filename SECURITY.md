# Security Policy

This document describes how security scanning is wired into the CI/CD pipelines
in this repository, what the gates are, and how to work with the findings.

**Snyk** is the primary scanner. Two supplements cover what Snyk cannot reach.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security problems.

Report privately to **nasir@nasir.id**. Include the affected app or workflow,
reproduction steps, and impact. Expect an acknowledgement within 72 hours.

## Scope

This repository is a monorepo covering both applications and infrastructure.
19 tracked manifests are in scope.

| Surface | Where | Count | Tool |
| --- | --- | --- | --- |
| Python backends | `apps/{agent,esim,iTung,layarsehat,pulsara,ucl,wc2026}` | 7 | Snyk Open Source |
| JS/TS frontends | `apps/{agent,iTung,layarsehat,mbg,nasir.id,pulsara,ucl,wc2026}` | 8 | Snyk Open Source |
| Go services | `apps/monitoring` | 1 | Snyk Open Source |
| Container images | built and run on the self-hosted runner | 12 | Snyk Container |
| Infrastructure as Code | `aws/`, `gcp/`, `cloudflare/` | 3 dirs | Snyk IaC |
| Application source | Python and JS/TS | — | Snyk Code |
| Flutter apps | `apps/{iTung,layarsehat}/android` | 2 | **Trivy** (see below) |
| Secrets | all paths + git history | — | **Gitleaks** (see below) |

## Tooling

### Snyk — primary scanner

[Snyk](https://snyk.io) covers four of the six surfaces above with one account
and one CLI, and provides a hosted dashboard with continuous re-evaluation —
stored snapshots are re-tested against new advisories without a CI run.

| Product | Command | Covers |
| --- | --- | --- |
| Open Source | `snyk test` | Dependency CVEs in pip, npm, Go modules |
| Container | `snyk container test` | Base-image and OS CVEs, **plus base-image upgrade advice** |
| IaC | `snyk iac test` | Terraform misconfiguration |
| Code | `snyk code test` | SAST: SQLi, SSRF, command injection, unsafe deserialisation |

The base-image upgrade advice is the strongest single reason to use Snyk here.
Every app workflow does `docker build` immediately followed by `docker run` on
the same host, and Snyk will tell you which base tag removes the most CVEs
rather than just listing them.

#### `test` versus `monitor`

These are different operations and both are needed:

- **`snyk test`** is a point-in-time gate. It exits non-zero on findings and
  **never populates the dashboard**.
- **`snyk monitor`** uploads a snapshot to the Snyk org. That snapshot is what
  gets continuously re-evaluated, and it is what the dashboard renders.

`monitor` must never fail a build — it is reporting, not gating.

### Gitleaks — secrets

**Snyk has no secret-scanning product.** This is a capability gap, not a
preference, so Gitleaks stays regardless of the primary scanner.

It walks full commit history, which matters because deploy jobs handle
`SSH_PASSWORD`, a base64 Android keystore, and `.env` files pulled from S3.

Note the limit: Gitleaks scans tracked content. A credential in `.git/config` —
for example a PAT embedded in a remote URL — is **not** covered by any scanner
here and must be handled by the practices in [Secrets Handling](#secrets-handling).

### Trivy — Flutter only

Snyk has no Dart/Flutter ecosystem support, so `apps/iTung/android` and
`apps/layarsehat/android` would otherwise have zero dependency coverage.
[Trivy](https://github.com/aquasecurity/trivy) is retained for exactly those two
paths and nothing else. It is a single static Go binary requiring no account.

If Flutter dependency coverage is judged unnecessary, delete the `flutter` job
from the sweep workflow and drop Trivy entirely — but do so as a decision, not
by accident.

### Tools deliberately not used

| Tool | Reason |
| --- | --- |
| CodeQL | Requires GitHub Advanced Security for private repos; Snyk Code covers the same ground |
| Checkov | Snyk IaC covers Terraform; revisit only for custom policy |
| Dependency-Track | Self-hosted dashboard needs ~4.5 GB RAM; the Snyk dashboard is hosted |
| OWASP Dependency-Check | Needs a JVM and slow NVD sync on the runner |

---

## Getting Started with Snyk

Step-by-step, from zero to a populated dashboard. Steps 1–6 are one-time setup.

### 1. Create the account and org

Sign up at [snyk.io](https://snyk.io) using the GitHub account that owns this
repository. Snyk creates a personal Org on first login.

Go to **Settings → General** and note the **Org slug** (the value that appears
in dashboard URLs as `app.snyk.io/org/<slug>`). You need it in step 3.

### 2. Enable Snyk Code

Snyk Code (SAST) is off by default. Go to **Settings → Snyk Code** and toggle it
on. Without this, `snyk code test` fails with an authorisation error rather than
a useful message.

### 3. Create a service account token

**Settings → Service accounts → Create**. Give it the **Org Admin** role and a
name like `github-actions-nasir-id`.

Use a service account, not your personal API token. A personal token is tied to
your login and dies when you rotate credentials or leave; a service account
token is independently revocable and does not carry your user permissions.

Copy the token once — it is not shown again.

### 4. Store the credentials in GitHub

In the repository, **Settings → Secrets and variables → Actions**:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `SNYK_TOKEN` | the service account token from step 3 |
| Variable | `SNYK_ORG` | the org slug from step 1 |

The org slug is not sensitive — it belongs in a variable, not a secret, so it
renders in logs and the job summary.

### 5. Decide about the GitHub integration — recommended: skip it

Snyk offers a GitHub App that imports repositories and opens fix PRs
automatically. **Do not enable it for this repository yet.**

The auto-importer imports every manifest it finds. In this repo that includes
`apps/iTung/backend_backup/requirements.txt`, which is tracked but dead. You
would get a permanent phantom project consuming quota on every recurring test,
with no clean way to exclude it.

Driving `snyk monitor` from CI with explicit paths gives exact control over
which projects exist. The cost is losing automatic fix PRs — a real trade-off.
Revisit once `backend_backup` is deleted from the repository.

### 6. Install the CLI locally

```bash
# Linux / WSL
curl -sfLo ~/.local/bin/snyk https://downloads.snyk.io/cli/stable/snyk-linux
chmod +x ~/.local/bin/snyk

# macOS
brew install snyk-cli

# any platform, if you have Node
npm install -g snyk
```

Authenticate — this opens a browser and binds the CLI to your account:

```bash
snyk auth
```

### 7. Run your first scan

```bash
cd apps/ucl/backend
snyk test --severity-threshold=high
```

Expect one of three outcomes:

| Exit code | Meaning |
| --- | --- |
| 0 | No findings at or above the threshold |
| 1 | Findings — this is what blocks a build |
| 2 | CLI error (bad token, network, unsupported flag) |
| 3 | **No supported manifest found.** Normal for a static directory |

Exit code 3 is the one that trips people up. In a monorepo it is a routine,
non-failing outcome and the pipeline treats it as success.

### 8. Seed the dashboard

From the repository root, register the projects you actually deploy:

```bash
for p in \
  apps/agent/backend apps/agent/frontend \
  apps/esim \
  apps/iTung/backend apps/iTung/frontend \
  apps/layarsehat/backend apps/layarsehat/frontend \
  apps/monitoring \
  apps/nasir.id \
  apps/pulsara/backend apps/pulsara/frontend \
  apps/ucl/backend apps/ucl/frontend \
  apps/wc2026/backend apps/wc2026/frontend
do
  echo "--- $p"
  ( cd "$p" && snyk monitor \
      --all-projects --detection-depth=3 \
      --exclude=node_modules,.next,build,dist \
      --target-reference=main ) || true
done
```

Then open `https://app.snyk.io/org/<your-slug>/projects`. Sixteen projects
should be listed. This is your dashboard baseline.

Note `apps/iTung/backend_backup` is deliberately absent, and `--exclude` is
mandatory — see [Monorepo Constraints](#monorepo-constraints).

### 9. Add the pipeline

Create `.github/workflows/snyk-scan.yml` from [The reusable workflow](#the-reusable-workflow)
below, then wire the callers per [Integrating with the app deploy workflows](#integrating-with-the-app-deploy-workflows).

Ship it with `fail_build: false`. Nothing blocks until you have read a week of
real output.

### 10. Verify

Push a trivial change to one app and confirm three things:

1. The `snyk` job appears and succeeds.
2. Its job summary shows a table with a dashboard link.
3. The corresponding project in the Snyk UI shows a fresh "last tested" time.

If all three hold, move through the [Rollout Stages](#rollout-stages).

---

## Monorepo Constraints

Three repository-specific facts that will otherwise cause confusing failures.

**`--exclude` is mandatory.** `node_modules` and `.next` are gitignored, so
Snyk's Git integration would never see them — but the self-hosted runner's
workspace **persists between jobs**. By the time a scan runs, earlier builds
have left both on disk, and `--all-projects --detection-depth=3` will crawl in
and register `.next/package.json` and nested module manifests as separate
projects. Always pass:

```
--exclude=node_modules,.next,build,dist,backend_backup
```

**`--all-projects` and `--project-name` are mutually exclusive.** The CLI
rejects the combination outright. With `--all-projects`, project names are
derived from manifest paths, which is stable and correct in a monorepo. Use
`--target-reference` to group by branch instead. `--project-name` is only valid
on single-project scans such as `snyk container monitor`.

**Exit code 3 is not a failure.** Directories with no supported manifest return
3, and treating that as a finding would block deploys on paths that simply have
nothing to scan.

## Quota

Roughly 31 projects: 16 Open Source, 12 container, 3 IaC. Every push to a
changed app triggers tests, and `monitor` snapshots trigger recurring
server-side re-tests.

Free-tier limits are per-month and modest; verify current numbers, as they
change. An active 31-project monorepo can exhaust a free tier, after which
`snyk test` returns errors rather than results.

**Therefore `fail_build` defaults to `false` and should stay there unless the
account is on a paid plan.** A quota-limited scanner is a poor merge gate: it
fails silently, at month-end, precisely when it is least expected. Use Snyk as
the dashboard and advisory layer; promote it to a hard gate only once quota is
guaranteed.

---

## Pipeline Gates

Three gates, in the order a change encounters them:

1. **Pre-deploy scan** — the reusable workflow runs `snyk test` and
   `snyk code test` against the changed app directory. Deploy jobs list it in
   `needs:`, so a failure blocks the deploy once `fail_build` is on.
2. **Post-build container scan** — the same workflow, invoked with an `image`
   input from inside the deploy job after `docker build`.
3. **IaC scan** — `snyk iac test`, called from the Terraform *plan* workflows.

### The reusable workflow

Complete contents of `.github/workflows/snyk-scan.yml`:

```yaml
name: 'Snyk Security'

on:
  workflow_call:
    inputs:
      path:
        description: 'Directory to scan, e.g. apps/ucl/backend'
        required: true
        type: string
      image:
        description: 'Locally built image, e.g. ucl-backend:latest. Empty skips the container scan.'
        required: false
        type: string
        default: ''
      severity:
        description: 'low | medium | high | critical'
        required: false
        type: string
        default: 'high'
      run_code:
        description: 'Run Snyk Code (SAST). Consumes a separate test against quota.'
        required: false
        type: boolean
        default: false
      fail_build:
        description: 'Block the deploy on findings. Keep false on a free plan - see Quota.'
        required: false
        type: boolean
        default: false
      monitor:
        description: 'Push a snapshot to the Snyk dashboard for continuous monitoring'
        required: false
        type: boolean
        default: true
    secrets:
      SNYK_TOKEN:
        required: true
      SSH_PASSWORD:
        required: false

permissions:
  contents: read

jobs:
  snyk:
    name: 'Snyk ${{ inputs.path }}'
    runs-on: [self-hosted, nasir-contabo]

    env:
      SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      SNYK_ORG: ${{ vars.SNYK_ORG }}
      TARGET: ${{ inputs.path }}
      SEV: ${{ inputs.severity }}
      IMAGE: ${{ inputs.image }}
      REPORTS: ${{ runner.temp }}/snyk-reports
      # The runner workspace persists between jobs, so gitignored build output
      # from earlier runs is still on disk and would be detected as projects.
      EXCLUDE: 'node_modules,.next,build,dist,backend_backup'

    steps:
      - name: Remove stale nested .git directories
        run: find "$GITHUB_WORKSPACE" -mindepth 2 -name ".git" -exec rm -rf {} + 2>/dev/null || true

      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Ensure Snyk CLI
        run: |
          set -euo pipefail
          mkdir -p "$HOME/.local/bin" "$REPORTS"
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"
          export PATH="$HOME/.local/bin:$PATH"
          if ! command -v snyk >/dev/null 2>&1; then
            echo "Snyk CLI not found on runner - installing to ~/.local/bin"
            curl -sfLo "$HOME/.local/bin/snyk" https://downloads.snyk.io/cli/stable/snyk-linux
            chmod +x "$HOME/.local/bin/snyk"
          fi
          snyk --version

      # ---- Open Source (dependencies) -----------------------------------
      # --fail-on=upgradable means only findings with an available fix can
      # block, so an unpatched upstream CVE is reported but does not stop a
      # deploy. Exit code 3 means "no supported manifest", a normal outcome
      # for a static directory, and is normalised to success.
      - name: 'Snyk: dependencies'
        id: oss
        working-directory: ${{ inputs.path }}
        run: |
          set -o pipefail
          rc=0
          snyk test \
            --all-projects \
            --detection-depth=3 \
            --exclude="$EXCLUDE" \
            --severity-threshold="$SEV" \
            --fail-on=upgradable \
            --sarif-file-output="$REPORTS/oss.sarif" \
            | tee "$REPORTS/oss.txt" || rc=$?
          if [ "$rc" = "3" ]; then
            echo "No supported manifest in $TARGET - skipping"
            rc=0
          fi
          echo "rc=$rc" >> "$GITHUB_OUTPUT"

      # Reporting only, never gating. --project-name is deliberately absent:
      # the CLI rejects it alongside --all-projects.
      - name: 'Snyk: monitor dependencies'
        if: ${{ inputs.monitor }}
        working-directory: ${{ inputs.path }}
        run: |
          snyk monitor \
            --all-projects \
            --detection-depth=3 \
            --exclude="$EXCLUDE" \
            --target-reference="${{ github.ref_name }}" || true

      # ---- Snyk Code (SAST) ---------------------------------------------
      # Requires Snyk Code to be enabled in org settings, else this errors.
      - name: 'Snyk: code'
        id: code
        if: ${{ inputs.run_code }}
        working-directory: ${{ inputs.path }}
        run: |
          set -o pipefail
          rc=0
          snyk code test \
            --severity-threshold="$SEV" \
            --sarif-file-output="$REPORTS/code.sarif" \
            | tee "$REPORTS/code.txt" || rc=$?
          if [ "$rc" = "3" ]; then rc=0; fi
          echo "rc=$rc" >> "$GITHUB_OUTPUT"

      # ---- Container ------------------------------------------------------
      # Only runs when the caller passes an image that already exists in the
      # runner's local Docker store. sudo -E preserves SNYK_TOKEN; sudo is
      # needed for the same reason docker needs it on this runner.
      # Application dependencies inside the image are included by default.
      - name: 'Snyk: container'
        id: container
        if: ${{ inputs.image != '' }}
        env:
          SSH_PASSWORD: ${{ secrets.SSH_PASSWORD }}
        run: |
          set -o pipefail
          rc=0
          echo "$SSH_PASSWORD" | sudo -SE snyk container test "$IMAGE" \
            --file="$TARGET/Dockerfile" \
            --severity-threshold="$SEV" \
            | tee "$REPORTS/container.txt" || rc=$?
          echo "rc=$rc" >> "$GITHUB_OUTPUT"
          if [ "${{ inputs.monitor }}" = "true" ]; then
            echo "$SSH_PASSWORD" | sudo -SE snyk container monitor "$IMAGE" \
              --file="$TARGET/Dockerfile" \
              --project-name="$TARGET/image" || true
          fi

      - name: Publish summary
        if: always()
        env:
          RC_OSS: ${{ steps.oss.outputs.rc }}
          RC_CODE: ${{ steps.code.outputs.rc }}
          RC_CONTAINER: ${{ steps.container.outputs.rc }}
        run: |
          r() {
            if [ -z "$1" ]; then echo "skipped"
            elif [ "$1" = "0" ]; then echo "pass"
            else echo "**findings**"; fi
          }
          {
            echo "## Snyk - \`$TARGET\`"
            echo ""
            echo "| Product | Result |"
            echo "| --- | --- |"
            echo "| Open Source | $(r "$RC_OSS") |"
            echo "| Code (SAST) | $(r "$RC_CODE") |"
            echo "| Container | $(r "$RC_CONTAINER") |"
            echo ""
            echo "Dashboard: https://app.snyk.io/org/$SNYK_ORG/projects"
          } >> "$GITHUB_STEP_SUMMARY"

      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: snyk-${{ github.run_id }}-${{ github.run_attempt }}
          path: ${{ runner.temp }}/snyk-reports/
          retention-days: 14
          if-no-files-found: warn

      - name: Enforce gate
        if: always()
        env:
          RC_OSS: ${{ steps.oss.outputs.rc }}
          RC_CODE: ${{ steps.code.outputs.rc }}
          RC_CONTAINER: ${{ steps.container.outputs.rc }}
        run: |
          if [ "${{ inputs.fail_build }}" != "true" ]; then
            echo "Report-only mode - not blocking"
            exit 0
          fi
          fail=0
          for v in "$RC_OSS" "$RC_CODE" "$RC_CONTAINER"; do
            if [ -n "$v" ] && [ "$v" != "0" ]; then fail=1; fi
          done
          if [ "$fail" = "1" ]; then
            echo "::error::Snyk findings at severity >= $SEV in $TARGET"
          fi
          exit $fail
```

### Integrating with the app deploy workflows

Each app workflow already has a `changes` job using `dorny/paths-filter`. Insert
a `snyk` job that depends on it, then add that job to the deploy job's `needs:`.
Using `apps-ucl.yml` as the worked example:

```yaml
jobs:
  changes:
    # ... unchanged ...

  # NEW
  snyk-backend:
    needs: changes
    if: ${{ needs.changes.outputs.backend == 'true' || github.event_name == 'workflow_dispatch' }}
    uses: ./.github/workflows/snyk-scan.yml
    with:
      path: apps/ucl/backend
      run_code: true
    secrets: inherit

  # NEW
  snyk-frontend:
    needs: changes
    if: ${{ needs.changes.outputs.frontend == 'true' || github.event_name == 'workflow_dispatch' }}
    uses: ./.github/workflows/snyk-scan.yml
    with:
      path: apps/ucl/frontend
    secrets: inherit

  deploy-backend:
    needs: [changes, snyk-backend]      # <- was: needs: changes
    if: ${{ needs.changes.outputs.backend == 'true' || github.event_name == 'workflow_dispatch' }}
    runs-on: [self-hosted, nasir-contabo]
    steps:
      # ... unchanged ...

  deploy-frontend:
    needs: [changes, snyk-frontend]     # <- was: needs: changes
    # ... unchanged ...
```

Three constraints when wiring this up:

- A job that uses `uses:` cannot also define `steps:`, `runs-on:`, or `env:`.
  The Snyk job is a call, not a job body.
- `secrets: inherit` is required so the called workflow receives `SNYK_TOKEN`
  and `SSH_PASSWORD`.
- Where a deploy job combines `needs:` with `if: always()` — as `deploy-android`
  does in `apps-layarsehat.yml` — adding to `needs:` is **not** enough, because
  `always()` ignores the failure. Gate it explicitly:

  ```yaml
    deploy-android:
      needs: [changes, snyk-android, deploy-backend, deploy-frontend]
      if: >-
        ${{ always()
            && needs.snyk-android.result == 'success'
            && (needs.changes.outputs.android == 'true' || github.event_name == 'workflow_dispatch') }}
  ```

Per-workflow mapping:

| Workflow | Scan paths |
| --- | --- |
| `apps-agent.yml` | `apps/agent/backend`, `apps/agent/frontend` |
| `apps-esim.yml` | `apps/esim` |
| `apps-games.yml` | (static; no manifest to scan) |
| `apps-itung.yml` | `apps/iTung/backend`, `apps/iTung/frontend` |
| `apps-layarsehat.yml` | `apps/layarsehat/backend`, `apps/layarsehat/frontend` |
| `apps-nasir.yml` | `apps/nasir.id` |
| `apps-pulsara.yml` | `apps/pulsara/backend`, `apps/pulsara/frontend` |
| `apps-ucl.yml` | `apps/ucl/backend`, `apps/ucl/frontend` |
| `apps-wc2026.yml` | `apps/wc2026/backend`, `apps/wc2026/frontend` |

The Flutter paths are absent by design — Snyk has no Dart support. They are
covered by the Trivy job in the [weekly sweep](#scheduled-full-scan).

`apps-nasir.yml` has no `changes` job — it is a single deploy job. Add the Snyk
call without an `if:` and point `needs:` at it.

### Integrating the container scan

The image only exists in the runner's local Docker store *after* the deploy job
builds it, so this is a second call to the same workflow, made after the deploy.
Add to `apps-layarsehat.yml`:

```yaml
  snyk-backend-image:
    needs: deploy-backend
    uses: ./.github/workflows/snyk-scan.yml
    with:
      path: apps/layarsehat/backend
      image: layarsehat-backend:latest
    secrets: inherit
```

This scans *after* the container is already running, so it reports rather than
prevents. To make it preventive instead, inline the equivalent step into the
deploy job between `docker build` and `docker run`:

```yaml
    - name: Snyk container scan
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        SSH_PASSWORD: ${{ secrets.SSH_PASSWORD }}
      run: |
        echo "$SSH_PASSWORD" | sudo -SE snyk container test \
          layarsehat-backend:latest \
          --file=apps/layarsehat/backend/Dockerfile \
          --severity-threshold=high
```

Note this leaves the previous container stopped and removed with no replacement
started if it fails. Use the post-deploy form until stage 3 of the rollout.

Snyk Container reports a **base image upgrade recommendation** alongside the CVE
list. Acting on that is usually a one-line Dockerfile change that clears more
findings than any dependency bump.

### Integrating with the Terraform workflows

Scan at **plan** time. Apply is triggered by push to `main` with no review step
after it, so plan is the last useful gate.

Add to `aws-plan.yml`, `gcp-plan.yml`, and `cloudflare-plan.yml`:

```yaml
  snyk-iac:
    runs-on: [self-hosted, nasir-contabo]
    env:
      SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - name: Snyk IaC
        run: |
          rc=0
          snyk iac test aws/services \
            --severity-threshold=high \
            --report \
            --target-reference=main || rc=$?
          # Remove this line at rollout stage 4 to make it blocking.
          exit 0
```

`--report` is the IaC equivalent of `monitor` — it publishes results to the
dashboard. `snyk iac` has no separate `monitor` subcommand.

The matrixed `terraform-plan` job can then take
`needs: [detect-changed-dirs, snyk-iac]`.

### Scheduled full scan

Per-path scans only fire when that path changes, so an app untouched for months
is never re-checked. Snyk's hosted monitoring covers this for registered
projects, but the sweep still matters for the Flutter paths, which have no Snyk
project at all.

```yaml
name: 'Weekly Security Sweep'

on:
  schedule:
    - cron: '0 18 * * 0'   # Sunday 01:00 WIB
  workflow_dispatch:

permissions:
  contents: read

jobs:
  # Refresh every Snyk snapshot so the dashboard reflects current HEAD.
  snyk:
    strategy:
      fail-fast: false
      matrix:
        path:
          - apps/agent/backend
          - apps/agent/frontend
          - apps/esim
          - apps/iTung/backend
          - apps/iTung/frontend
          - apps/layarsehat/backend
          - apps/layarsehat/frontend
          - apps/monitoring
          - apps/nasir.id
          - apps/pulsara/backend
          - apps/pulsara/frontend
          - apps/ucl/backend
          - apps/ucl/frontend
          - apps/wc2026/backend
          - apps/wc2026/frontend
    uses: ./.github/workflows/snyk-scan.yml
    with:
      path: ${{ matrix.path }}
      fail_build: false        # never block on a schedule
      monitor: true
    secrets: inherit

  # Flutter has no Snyk ecosystem support - Trivy covers these two only.
  flutter:
    runs-on: [self-hosted, nasir-contabo]
    strategy:
      fail-fast: false
      matrix:
        path: [apps/iTung/android, apps/layarsehat/android]
    steps:
      - uses: actions/checkout@v4
      - name: Trivy dependency scan
        run: |
          if ! command -v trivy >/dev/null 2>&1; then
            curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh \
              | sh -s -- -b "$HOME/.local/bin" v0.58.1
            export PATH="$HOME/.local/bin:$PATH"
          fi
          trivy fs --scanners vuln --severity HIGH,CRITICAL \
            --ignore-unfixed --exit-code 0 "${{ matrix.path }}"

  # Snyk does not scan for secrets. Gitleaks covers full history.
  secrets:
    runs-on: [self-hosted, nasir-contabo]
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0      # gitleaks needs full history
      - name: Gitleaks
        run: |
          if ! command -v gitleaks >/dev/null 2>&1; then
            GL_VER=8.21.2
            mkdir -p "$HOME/.local/bin"
            curl -sfL "https://github.com/gitleaks/gitleaks/releases/download/v${GL_VER}/gitleaks_${GL_VER}_linux_x64.tar.gz" \
              | tar -xz -C "$HOME/.local/bin" gitleaks
            export PATH="$HOME/.local/bin:$PATH"
          fi
          gitleaks detect --source . --redact --no-banner --exit-code 1
```

---

## Severity Policy

`--severity-threshold=high` throughout, so only High and Critical are reported.

| Severity | Dependencies | Container | IaC | Code |
| --- | --- | --- | --- | --- |
| Critical | Block | Block | Block | Block |
| High | Block | Block | Block | Block |
| Medium | Not reported | Not reported | Not reported | Not reported |
| Low | Not reported | Not reported | Not reported | Not reported |

Any secret found by Gitleaks blocks unconditionally.

"Block" applies only once `fail_build: true` is set — see [Quota](#quota) before
enabling it.

`--fail-on=upgradable` is set on dependency scans, so only findings with an
available fix can fail a build. A CVE with no upstream patch appears in the
dashboard but does not block a deploy that would otherwise ship.

## Rollout Stages

Every gate is a caller input, so a stage advances by editing the `with:` block —
never the workflow itself.

| Stage | Change | Duration |
| --- | --- | --- |
| 1. Baseline | All callers `fail_build: false`. Everything reports, nothing blocks. Read the dashboard. | 1 week |
| 2. Secrets | Enable the Gitleaks sweep job as blocking. Should already be zero; a hit is always real. | permanent |
| 3. Container | Move the container scan inline, between `docker build` and `docker run`. | after stage 2 clean |
| 4. Dependencies + IaC | `fail_build: true` on app callers, then drop `exit 0` from the IaC job. | one at a time |
| 5. Code | `run_code: true` everywhere, starting again at report-only. | after 4 |

Stages 3–5 assume a paid plan. On the free tier, stop at stage 2 and treat Snyk
as advisory.

## Running Scans Locally

Reproduce any CI result before pushing:

```bash
# Dependencies
cd apps/ucl/backend && snyk test --severity-threshold=high

# Dependencies across the whole monorepo
snyk test --all-projects --detection-depth=3 \
  --exclude=node_modules,.next,build,dist,backend_backup \
  --severity-threshold=high

# SAST
snyk code test --severity-threshold=high apps/ucl/backend

# Terraform
snyk iac test aws/services --severity-threshold=high

# A locally built image, with base image upgrade advice
docker build -t ucl-backend:local apps/ucl/backend
snyk container test ucl-backend:local --file=apps/ucl/backend/Dockerfile

# Secrets across full history
gitleaks detect --source . --redact --verbose
```

## Suppressing a Finding

Suppressions are time-bound and must carry a reason. Never suppress by raising
the severity threshold.

Snyk uses a `.snyk` policy file. Generate entries with the CLI rather than
hand-editing:

```bash
snyk ignore --id=SNYK-PYTHON-REQUESTS-1234567 \
  --expiry=2026-11-01 \
  --reason="Transitive via boto3; the vulnerable code path is not reachable. Upstream fix tracked at <link>."
```

This writes to `.snyk` in the current directory. Commit it — the file is the
audit trail, and CI reads it automatically.

Expiry is mandatory. An ignore without one is a permanent blind spot.

For Snyk Code, annotate the line with `// deepcode ignore <rule-id>: <reason>`.
Undocumented suppressions are treated as findings during review.

## Secrets Handling

Rules that apply to every workflow in this repository:

- Secrets come from GitHub Actions secrets or S3 at runtime. Never commit them.
- Every `.env` written to the runner workspace must be removed in a step marked
  `if: always()`, so a failed deploy does not leave credentials on a shared
  self-hosted runner.
- The Android keystore is decoded at build time and deleted in an `if: always()`
  step.
- **Never embed a token in a git remote URL.** A PAT in
  `https://<token>@github.com/...` sits in cleartext in `.git/config` and is
  invisible to every scanner here, because it is not tracked content. Use SSH
  remotes or a credential helper.
- Prefer a `NOPASSWD` sudoers rule scoped to `/usr/bin/docker`, or adding the
  runner user to the `docker` group, over passing `SSH_PASSWORD` into
  individual steps.
- Rotate `SSH_PASSWORD`, `KEYSTORE_BASE64`, `SNYK_TOKEN`, and AWS keys on any
  suspected exposure, and after any Gitleaks finding.

## Runner Security

Deploys execute on a self-hosted runner (`[self-hosted, nasir-contabo]`). Unlike
GitHub-hosted runners the workspace persists between jobs, so:

- Workflows must clean up credential material themselves.
- Scans must pass `--exclude` for build output, which persists across jobs.
- This repository should not accept `pull_request` triggers from forks onto the
  self-hosted runner.
- `SNYK_TOKEN` is an Org Admin service account token. Scope it down and rotate
  it if the runner is ever shared.
