"""Read-only GitHub inspection via the REST API. No new dependency — plain
`requests`, same as http_fetch.py. Needs GITHUB_TOKEN (a read-only PAT) in
env; every tool refuses cleanly if it's not set rather than raising."""
import requests
from config import GITHUB_TOKEN
from agent.tools.base import Tool

_API = "https://api.github.com"
_MAX_CHARS = 4000


def _gh_get(path: str, params: dict | None = None) -> tuple[list | dict | None, str | None]:
    """GET the GitHub API. Returns (json, None) on success or (None, error_string)."""
    if not GITHUB_TOKEN:
        return None, "Error: GITHUB_TOKEN is not configured."
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    try:
        r = requests.get(f"{_API}{path}", headers=headers, params=params, timeout=15)
    except Exception as e:
        return None, f"Error: {e}"
    if r.status_code >= 400:
        try:
            msg = r.json().get("message", r.text[:200])
        except Exception:
            msg = r.text[:200]
        return None, f"Error: GitHub API {r.status_code} — {msg}"
    return r.json(), None


def _render(lines: list[str], empty: str) -> str:
    return ("\n".join(lines) or empty)[:_MAX_CHARS]


_REPO_PROP = {"repo": {"type": "string", "description": "owner/repo, e.g. 'nasir/nasir.id'."}}


class ListGithubIssuesTool(Tool):
    name = "list_github_issues"
    description = "List issues (not pull requests) for a GitHub repo."
    input_schema = {
        "type": "object",
        "properties": {
            **_REPO_PROP,
            "state": {"type": "string", "description": "open | closed | all. Default open."},
            "limit": {"type": "integer", "description": "Max issues, default 10."},
        },
        "required": ["repo"],
    }

    def run(self, repo: str, state: str = "open", limit: int = 10) -> str:
        data, err = _gh_get(f"/repos/{repo}/issues",
                            {"state": state, "per_page": min(limit, 50)})
        if err:
            return err
        lines = [
            f"#{i['number']} [{i['state']}] {i['title']} — {i['user']['login']} — {i['html_url']}"
            for i in data if "pull_request" not in i  # the issues endpoint also returns PRs
        ]
        return _render(lines, "No issues found.")


class ListGithubPullRequestsTool(Tool):
    name = "list_github_pull_requests"
    description = "List pull requests for a GitHub repo."
    input_schema = {
        "type": "object",
        "properties": {
            **_REPO_PROP,
            "state": {"type": "string", "description": "open | closed | all. Default open."},
            "limit": {"type": "integer", "description": "Max PRs, default 10."},
        },
        "required": ["repo"],
    }

    def run(self, repo: str, state: str = "open", limit: int = 10) -> str:
        data, err = _gh_get(f"/repos/{repo}/pulls",
                            {"state": state, "per_page": min(limit, 50)})
        if err:
            return err
        lines = [
            f"#{p['number']} [{p['state']}] {p['title']} — "
            f"{p['head']['ref']} → {p['base']['ref']} — {p['html_url']}"
            for p in data
        ]
        return _render(lines, "No pull requests found.")


class ListGithubActionsRunsTool(Tool):
    name = "list_github_actions_runs"
    description = "List recent GitHub Actions workflow runs for a repo."
    input_schema = {
        "type": "object",
        "properties": {
            **_REPO_PROP,
            "branch": {"type": "string", "description": "Filter to one branch, optional."},
            "limit": {"type": "integer", "description": "Max runs, default 10."},
        },
        "required": ["repo"],
    }

    def run(self, repo: str, branch: str | None = None, limit: int = 10) -> str:
        params = {"per_page": min(limit, 50)}
        if branch:
            params["branch"] = branch
        data, err = _gh_get(f"/repos/{repo}/actions/runs", params)
        if err:
            return err
        lines = [
            f"#{r['run_number']} {r['name']} — {r['status']}/{r['conclusion'] or 'pending'} — "
            f"{r['head_branch']} — {r['created_at']} — {r['html_url']}"
            for r in data.get("workflow_runs", [])
        ]
        return _render(lines, "No workflow runs found.")


class ListGithubCommitsTool(Tool):
    name = "list_github_commits"
    description = "List recent commits on a branch (default branch if not given)."
    input_schema = {
        "type": "object",
        "properties": {
            **_REPO_PROP,
            "branch": {"type": "string", "description": "Branch/SHA, defaults to the repo's default branch."},
            "limit": {"type": "integer", "description": "Max commits, default 10."},
        },
        "required": ["repo"],
    }

    def run(self, repo: str, branch: str | None = None, limit: int = 10) -> str:
        params = {"per_page": min(limit, 50)}
        if branch:
            params["sha"] = branch
        data, err = _gh_get(f"/repos/{repo}/commits", params)
        if err:
            return err
        lines = [
            f"{c['sha'][:7]} {c['commit']['author']['name']} — "
            f"{c['commit']['message'].splitlines()[0]} — {c['commit']['author']['date']}"
            for c in data
        ]
        return _render(lines, "No commits found.")
