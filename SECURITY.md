# Security Policy

This document describes how security scanning is wired into the CI/CD pipelines
in this repository, what the gates are, and how to work with the findings.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security problems.

Report privately to **nasir@nasir.id**. Include the affected app or workflow,
reproduction steps, and impact. Expect an acknowledgement within 72 hours.

## Scope

This repository is a monorepo covering both applications and infrastructure.
Everything below is in scope for the scanning pipeline.

| Surface | Where | Ecosystem |
| --- | --- | --- |
| Python backends | `apps/{agent,esim,iTung,layarsehat,pulsara,ucl,wc2026}` | `requirements.txt` |
| JS/TS frontends | `apps/{agent,iTung,layarsehat,mbg,nasir.id,pulsara,ucl,wc2026}` | `package.json` / lockfile |
| Go services | `apps/monitoring` | `go.mod` |
| Flutter apps | `apps/{iTung,layarsehat}/android` | `pubspec.yaml` |
| Container images | 12 × `Dockerfile`, built and run on the self-hosted runner | OS + language layers |
| Infrastructure as Code | `aws/`, `gcp/`, `cloudflare/` | Terraform |
| CI/CD | `.github/workflows/*.yml` | GitHub Actions |

## Tooling

### Trivy — primary scanner

[Trivy](https://github.com/aquasecurity/trivy) (Aqua Security, Apache-2.0) is the
primary tool. It is a single static Go binary, requires **no account and no SaaS
enrolment**, and is the only scanner that covers all four surfaces above:

| Mode | Command | Covers |
| --- | --- | --- |
| `fs` | `trivy fs --scanners vuln,secret <path>` | Dependency CVEs, hardcoded secrets |
| `image` | `trivy image <tag>` | Base-image and OS package CVEs in the built container |
| `config` | `trivy config <path>` | Terraform misconfiguration, Dockerfile best practice |

The `image` mode carries the most weight here. Every app workflow does
`docker build` immediately followed by `docker run` on the same host, so the
built image — not the manifest — is what actually reaches production. Scanning
manifests alone misses every CVE in the `python:*-slim` and `node:*-alpine`
base layers.

### Gitleaks — git history secrets

Trivy's secret scanner only inspects the current working tree. [Gitleaks](https://github.com/gitleaks/gitleaks)
walks the full commit history, which matters because deploy jobs handle
`SSH_PASSWORD`, a base64 Android keystore, and `.env` files pulled from S3.

Run once against full history, then per-PR against the diff.

### Semgrep OSS — application SAST

Trivy does not perform code analysis. [Semgrep OSS](https://github.com/semgrep/semgrep)
with `p/python`, `p/javascript`, and `p/secrets` covers the class Trivy cannot
see: SQL injection, SSRF, command injection, and unsafe deserialisation in the
FastAPI backends and Next/Svelte frontends.

Added after Trivy is green, not before.

### Tools deliberately not used

| Tool | Reason |
| --- | --- |
| Snyk | Paid beyond the free tier; sends private manifests to a third party |
| CodeQL | Requires GitHub Advanced Security for private repos; slow on a self-hosted runner |
| Checkov | Trivy's Terraform coverage is sufficient at this scale; revisit only for custom policy |
| OWASP Dependency-Check | Needs a JVM and slow NVD sync on the runner |

## Pipeline Gates

Three gates, in the order a change encounters them:

1. **Pre-deploy scan** — the reusable workflow below runs `trivy fs` and
   `trivy config` against the changed app directory. Deploy jobs list it in
   `needs:`, so a failure blocks the deploy.
2. **Post-build image scan** — a step inside each deploy job, between
   `docker build` and `docker run`.
3. **IaC scan** — the same reusable workflow, called from the Terraform *plan*
   workflows.

### The reusable workflow

Complete contents of `.github/workflows/security-scan.yml`:

```yaml
name: 'Security Scan'

on:
  workflow_call:
    inputs:
      path:
        description: 'Directory to scan, e.g. apps/ucl/backend'
        required: true
        type: string
      severity:
        description: 'Severities treated as findings'
        required: false
        type: string
        default: 'HIGH,CRITICAL'
      fail_on_vuln:
        description: 'Block on dependency CVEs (rollout stage 3+)'
        required: false
        type: boolean
        default: false
      fail_on_secret:
        description: 'Block on detected secrets (rollout stage 2+)'
        required: false
        type: boolean
        default: true
      fail_on_config:
        description: 'Block on IaC / Dockerfile misconfiguration (stage 4+)'
        required: false
        type: boolean
        default: false
      scan_history:
        description: 'Also run gitleaks across full git history'
        required: false
        type: boolean
        default: false
      trivy_version:
        description: 'Version installed if the runner has no trivy on PATH'
        required: false
        type: string
        default: 'v0.58.1'

  # Allows an ad-hoc scan of any directory from the Actions tab.
  workflow_dispatch:
    inputs:
      path:
        description: 'Directory to scan'
        required: true
        type: string
      severity:
        description: 'Severities treated as findings'
        required: false
        type: string
        default: 'HIGH,CRITICAL'
      scan_history:
        description: 'Also run gitleaks across full git history'
        required: false
        type: boolean
        default: true

permissions:
  contents: read

jobs:
  scan:
    name: 'Scan ${{ inputs.path }}'
    runs-on: [self-hosted, nasir-contabo]

    env:
      TARGET: ${{ inputs.path }}
      SEVERITY: ${{ inputs.severity }}
      REPORTS: ${{ runner.temp }}/security-reports
      # Authenticate DB pulls against ghcr.io. Anonymous pulls are rate limited
      # and every workflow on this runner shares one source IP, so an
      # unauthenticated fleet eventually fails with TOOMANYREQUESTS.
      TRIVY_USERNAME: ${{ github.actor }}
      TRIVY_PASSWORD: ${{ secrets.GITHUB_TOKEN }}
      TRIVY_CACHE_DIR: ${{ runner.temp }}/trivy-cache
      TRIVY_NO_PROGRESS: 'true'
      TRIVY_TIMEOUT: '10m'

    steps:
      - name: Remove stale nested .git directories
        run: find "$GITHUB_WORKSPACE" -mindepth 2 -name ".git" -exec rm -rf {} + 2>/dev/null || true

      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          # gitleaks needs full history; a shallow clone silently scans nothing.
          # Quoted so the expression yields a truthy string -- an unquoted 0
          # is falsy and would collapse to 1.
          fetch-depth: ${{ inputs.scan_history && '0' || '1' }}

      - name: Ensure Trivy is available
        run: |
          set -euo pipefail
          mkdir -p "$HOME/.local/bin"
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"
          export PATH="$HOME/.local/bin:$PATH"
          if ! command -v trivy >/dev/null 2>&1; then
            echo "Trivy not found on runner - installing to ~/.local/bin"
            curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh \
              | sh -s -- -b "$HOME/.local/bin" "${{ inputs.trivy_version }}"
          fi
          trivy --version

      - name: Prepare scan
        id: prep
        run: |
          set -euo pipefail
          if [ ! -d "$TARGET" ]; then
            echo "::error::Scan target '$TARGET' does not exist"
            exit 1
          fi
          rm -rf "$REPORTS" && mkdir -p "$REPORTS"
          # Artifact names may not contain '/'.
          echo "slug=$(echo "$TARGET" | tr '/.' '--')" >> "$GITHUB_OUTPUT"

      # ---- Gate 1a: dependency CVEs -------------------------------------
      # --ignore-unfixed so only CVEs with an available patch can block.
      # rc is captured via '|| rc=$?' because the default shell is 'bash -e':
      # a bare failing pipeline would abort the step before rc is recorded.
      - name: 'Trivy: dependencies'
        id: vuln
        run: |
          set -o pipefail
          rc=0
          trivy fs \
            --scanners vuln \
            --severity "$SEVERITY" \
            --ignore-unfixed \
            --exit-code 1 \
            --format table \
            "$TARGET" | tee "$REPORTS/deps.txt" || rc=$?
          trivy fs --scanners vuln --severity "$SEVERITY" --ignore-unfixed \
            --format json --output "$REPORTS/deps.json" "$TARGET" || true
          echo "rc=$rc" >> "$GITHUB_OUTPUT"

      # ---- Gate 1b: secrets in the working tree -------------------------
      # No severity filter: any credential in the tree is a finding.
      - name: 'Trivy: secrets'
        id: secret
        run: |
          set -o pipefail
          rc=0
          trivy fs \
            --scanners secret \
            --exit-code 1 \
            --format table \
            "$TARGET" | tee "$REPORTS/secrets.txt" || rc=$?
          echo "rc=$rc" >> "$GITHUB_OUTPUT"

      # ---- Gate 1c: Dockerfile and Terraform misconfiguration -----------
      - name: 'Trivy: misconfiguration'
        id: config
        run: |
          set -o pipefail
          rc=0
          trivy config \
            --severity "$SEVERITY" \
            --exit-code 1 \
            --format table \
            "$TARGET" | tee "$REPORTS/config.txt" || rc=$?
          echo "rc=$rc" >> "$GITHUB_OUTPUT"

      # ---- Gate 1d: secrets across git history --------------------------
      - name: 'Gitleaks: git history'
        id: gitleaks
        if: ${{ inputs.scan_history }}
        run: |
          set -o pipefail
          if ! command -v gitleaks >/dev/null 2>&1; then
            GL_VER=8.21.2
            curl -sfL "https://github.com/gitleaks/gitleaks/releases/download/v${GL_VER}/gitleaks_${GL_VER}_linux_x64.tar.gz" \
              | tar -xz -C "$HOME/.local/bin" gitleaks
          fi
          rc=0
          gitleaks detect \
            --source . \
            --redact \
            --report-format sarif \
            --report-path "$REPORTS/gitleaks.sarif" \
            --exit-code 1 \
            --no-banner || rc=$?
          echo "rc=$rc" >> "$GITHUB_OUTPUT"

      - name: Publish summary
        if: always()
        env:
          RC_VULN: ${{ steps.vuln.outputs.rc }}
          RC_SECRET: ${{ steps.secret.outputs.rc }}
          RC_CONFIG: ${{ steps.config.outputs.rc }}
          RC_GITLEAKS: ${{ steps.gitleaks.outputs.rc }}
          FAIL_VULN: ${{ inputs.fail_on_vuln }}
          FAIL_SECRET: ${{ inputs.fail_on_secret }}
          FAIL_CONFIG: ${{ inputs.fail_on_config }}
          HISTORY: ${{ inputs.scan_history }}
        run: |
          r() { if [ "$1" = "0" ]; then echo "pass"; else echo "**findings**"; fi; }
          b() { if [ "$1" = "true" ]; then echo "yes"; else echo "warn only"; fi; }
          {
            echo "## Security scan - \`$TARGET\`"
            echo ""
            echo "| Check | Result | Blocking |"
            echo "| --- | --- | --- |"
            echo "| Dependencies | $(r "$RC_VULN") | $(b "$FAIL_VULN") |"
            echo "| Secrets (tree) | $(r "$RC_SECRET") | $(b "$FAIL_SECRET") |"
            echo "| Misconfiguration | $(r "$RC_CONFIG") | $(b "$FAIL_CONFIG") |"
            if [ "$HISTORY" = "true" ]; then
              echo "| Secrets (history) | $(r "$RC_GITLEAKS") | yes |"
            fi
          } >> "$GITHUB_STEP_SUMMARY"

      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: security-${{ steps.prep.outputs.slug }}-${{ github.run_id }}-${{ github.run_attempt }}
          path: ${{ runner.temp }}/security-reports/
          retention-days: 14
          if-no-files-found: warn

      # Single decision point. Each check contributes only if its gate is on,
      # so the rollout stages are controlled entirely by caller inputs.
      - name: Enforce gates
        if: always()
        env:
          RC_VULN: ${{ steps.vuln.outputs.rc }}
          RC_SECRET: ${{ steps.secret.outputs.rc }}
          RC_CONFIG: ${{ steps.config.outputs.rc }}
          RC_GITLEAKS: ${{ steps.gitleaks.outputs.rc }}
          FAIL_VULN: ${{ inputs.fail_on_vuln }}
          FAIL_SECRET: ${{ inputs.fail_on_secret }}
          FAIL_CONFIG: ${{ inputs.fail_on_config }}
          HISTORY: ${{ inputs.scan_history }}
        run: |
          fail=0
          if [ "$FAIL_VULN" = "true" ] && [ "$RC_VULN" != "0" ]; then
            echo "::error::Dependency vulnerabilities at $SEVERITY in $TARGET"; fail=1
          fi
          if [ "$FAIL_SECRET" = "true" ] && [ "$RC_SECRET" != "0" ]; then
            echo "::error::Secrets detected in $TARGET"; fail=1
          fi
          if [ "$FAIL_CONFIG" = "true" ] && [ "$RC_CONFIG" != "0" ]; then
            echo "::error::Misconfiguration at $SEVERITY in $TARGET"; fail=1
          fi
          if [ "$HISTORY" = "true" ] && [ "$RC_GITLEAKS" != "0" ]; then
            echo "::error::Secrets found in git history"; fail=1
          fi
          exit $fail
```

Two notes on why this calls the Trivy CLI rather than `aquasecurity/trivy-action`:
the runner has Trivy installed via apt, so invoking it directly avoids
re-downloading a binary on every job; and the raw CLI lets each check report its
own exit code into a single `Enforce gates` step, which is what makes the
staged rollout possible without editing every caller.

### Integrating with the app deploy workflows

Each app workflow already has a `changes` job using `dorny/paths-filter`. Insert
a `security` job that depends on it, then add that job to the deploy job's
`needs:`. Using `apps-ucl.yml` as the worked example:

```yaml
jobs:
  changes:
    # ... unchanged ...

  # NEW
  security-backend:
    needs: changes
    if: ${{ needs.changes.outputs.backend == 'true' || github.event_name == 'workflow_dispatch' }}
    uses: ./.github/workflows/security-scan.yml
    with:
      path: apps/ucl/backend
    secrets: inherit

  # NEW
  security-frontend:
    needs: changes
    if: ${{ needs.changes.outputs.frontend == 'true' || github.event_name == 'workflow_dispatch' }}
    uses: ./.github/workflows/security-scan.yml
    with:
      path: apps/ucl/frontend
    secrets: inherit

  deploy-backend:
    needs: [changes, security-backend]     # <- was: needs: changes
    if: ${{ needs.changes.outputs.backend == 'true' || github.event_name == 'workflow_dispatch' }}
    runs-on: [self-hosted, nasir-contabo]
    steps:
      # ... unchanged ...

  deploy-frontend:
    needs: [changes, security-frontend]    # <- was: needs: changes
    # ... unchanged ...
```

Three constraints to respect when wiring this up:

- A job that uses `uses:` cannot also define `steps:`, `runs-on:`, or `env:`.
  The security job is a call, not a job body.
- `secrets: inherit` is required so the called workflow receives `GITHUB_TOKEN`
  for authenticated Trivy DB pulls.
- Where a deploy job already has `needs: [changes, deploy-backend, deploy-frontend]`
  combined with `if: always()` — as `deploy-android` does in `apps-layarsehat.yml`
  — adding the security job to `needs:` is **not** enough, because `always()`
  ignores the failure. Gate it explicitly:

  ```yaml
    deploy-android:
      needs: [changes, security-android, deploy-backend, deploy-frontend]
      if: >-
        ${{ always()
            && needs.security-android.result == 'success'
            && (needs.changes.outputs.android == 'true' || github.event_name == 'workflow_dispatch') }}
  ```

Per-workflow mapping:

| Workflow | Scan paths |
| --- | --- |
| `apps-agent.yml` | `apps/agent/backend`, `apps/agent/frontend` |
| `apps-esim.yml` | `apps/esim` |
| `apps-games.yml` | (static; scan only if a manifest is added) |
| `apps-itung.yml` | `apps/iTung/backend`, `apps/iTung/frontend`, `apps/iTung/android` |
| `apps-layarsehat.yml` | `apps/layarsehat/backend`, `apps/layarsehat/frontend`, `apps/layarsehat/android` |
| `apps-nasir.yml` | `apps/nasir.id` |
| `apps-pulsara.yml` | `apps/pulsara/backend`, `apps/pulsara/frontend` |
| `apps-ucl.yml` | `apps/ucl/backend`, `apps/ucl/frontend` |
| `apps-wc2026.yml` | `apps/wc2026/backend`, `apps/wc2026/frontend` |

`apps-nasir.yml` has no `changes` job — it is a single deploy job. Add the
security call without an `if:` and point `needs:` at it.

### Integrating the post-build image scan

This one cannot live in the reusable workflow: the image only exists in the
runner's local Docker store *after* the deploy job builds it. Add it as a step
between `docker build` and `docker run`. In `apps-layarsehat.yml`, the backend
build ends at line 59 and the run begins at line 61 — the step goes between:

```yaml
    - name: Scan built image
      env:
        SSH_PASSWORD: ${{ secrets.SSH_PASSWORD }}
        TRIVY_USERNAME: ${{ github.actor }}
        TRIVY_PASSWORD: ${{ secrets.GITHUB_TOKEN }}
      run: |
        echo "$SSH_PASSWORD" | sudo -SE trivy image \
          --severity HIGH,CRITICAL \
          --ignore-unfixed \
          --exit-code 1 \
          --no-progress \
          layarsehat-backend:latest
```

`sudo -SE` — `-S` reads the password from stdin as the rest of the workflow
does, and `-E` preserves the `TRIVY_*` environment so the DB pull stays
authenticated under `sudo`. Trivy needs root here for the same reason `docker`
does: to read the local image store.

Because this step precedes `docker run`, a failure leaves the previous
container stopped and removed but no new one started. During the rollout use
`--exit-code 0` here, and only switch to `1` once stage 3 is reached.

### Integrating with the Terraform workflows

Scan at **plan** time. Apply is triggered by push to `main` with no review step
after it, so plan is the last point where a gate is useful.

Add to `aws-plan.yml`, `gcp-plan.yml`, and `cloudflare-plan.yml`:

```yaml
  security:
    uses: ./.github/workflows/security-scan.yml
    with:
      path: aws/services          # gcp/services, cloudflare/ respectively
      fail_on_config: false       # flip to true at rollout stage 4
      fail_on_vuln: false         # no application deps under this path
    secrets: inherit
```

The matrixed `terraform-plan` job can then take `needs: [detect-changed-dirs, security]`.
Note that this scans the whole IaC tree rather than only the changed
directories — `trivy config` on Terraform is fast enough that per-directory
matrixing adds complexity without saving meaningful time.

### Scheduled full scan

Per-path scans only fire when that path changes, so an app nobody has touched
in six months is never re-checked against a database that has moved on. Add a
weekly sweep as its own workflow:

```yaml
name: 'Weekly Security Sweep'

on:
  schedule:
    - cron: '0 18 * * 0'   # Sunday 01:00 WIB
  workflow_dispatch:

permissions:
  contents: read

jobs:
  sweep:
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
          - aws/services
          - gcp
          - cloudflare
    uses: ./.github/workflows/security-scan.yml
    with:
      path: ${{ matrix.path }}
      fail_on_vuln: false        # report-only; never block on a schedule
      fail_on_secret: false
      scan_history: true
    secrets: inherit
```

`apps/monitoring` appears here because it has a `go.mod` but no deploy workflow,
so the sweep is its only coverage.

## Severity Policy

| Severity | Application code / IaC | Dependencies | Container base image |
| --- | --- | --- | --- |
| CRITICAL | Block | Block | Block |
| HIGH | Block | Block | Block |
| MEDIUM | Warn | Warn | Warn |
| LOW / UNKNOWN | Ignore | Ignore | Ignore |

Any detected **secret** blocks at every severity.

`--ignore-unfixed` is set on dependency and image scans, so only CVEs with an
available fix can fail a build. A CVE with no upstream patch is recorded but
does not block a deploy that would otherwise ship.

## Rollout Stages

Enabling every gate at once against an unscanned monorepo produces noise, not
security. Stage it:

1. **Baseline** — all scans at `exit-code: 0`, one week, collect findings.
2. **Secrets** — flip to `exit-code: 1`. Should be zero; a hit is always real.
3. **Images** — flip to `exit-code: 1` with `--ignore-unfixed`.
4. **IaC** — flip `trivy config` to `exit-code: 1`.
5. **SAST** — add Semgrep, starting again at warn-only.

## Running Scans Locally

Reproduce any CI failure before pushing:

```bash
# Dependencies and working-tree secrets
trivy fs --scanners vuln,secret --severity HIGH,CRITICAL --ignore-unfixed apps/ucl/backend

# Terraform and Dockerfile misconfiguration
trivy config --severity HIGH,CRITICAL aws/services

# A locally built image
docker build -t ucl-backend:local apps/ucl/backend
trivy image --severity HIGH,CRITICAL --ignore-unfixed ucl-backend:local

# Full git history
gitleaks detect --source . --verbose
```

Install Trivy on the runner once via the Aqua apt repository rather than
re-downloading the binary on every job.

## Suppressing a Finding

Suppressions are time-bound and must carry a reason. Never suppress by widening
the severity threshold.

Create `.trivyignore` next to the scanned path:

```
# CVE-2024-XXXXX — transitive via <package>, not reachable from our code paths.
# Upstream fix tracked at <link>. Re-evaluate 2026-11-01.
CVE-2024-XXXXX exp:2026-11-01
```

For Semgrep, annotate the line with `# nosemgrep: <rule-id>` and the same
justification. Undocumented suppressions are treated as findings during review.

## Secrets Handling

Rules that apply to every workflow in this repository:

- Secrets come from GitHub Actions secrets or S3 at runtime. Never commit them.
- Every `.env` written to the runner workspace must be removed in a step marked
  `if: always()`, so a failed deploy does not leave credentials on a shared
  self-hosted runner.
- The Android keystore is decoded at build time and deleted in an `if: always()`
  step.
- Prefer a `NOPASSWD` sudoers rule scoped to `/usr/bin/docker`, or adding the
  runner user to the `docker` group, over passing `SSH_PASSWORD` into
  individual steps.
- Rotate `SSH_PASSWORD`, `KEYSTORE_BASE64`, and AWS keys on any suspected
  exposure, and after any Gitleaks history finding.

## Runner Security

Deploys execute on a self-hosted runner (`[self-hosted, nasir-contabo]`). Unlike
GitHub-hosted runners the workspace persists between jobs, so:

- Workflows must clean up credential material themselves.
- This repository should not accept `pull_request` triggers from forks onto the
  self-hosted runner.
- Keep the Trivy vulnerability database current; a stale DB silently degrades
  every gate above.
