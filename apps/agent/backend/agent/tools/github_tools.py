"""GitHub inspection via the REST API — mostly read-only (issues, PRs, Actions
runs, commits, repo listing), plus one write tool (create_github_repo). No new
dependency — plain `requests`, same as http_fetch.py. Needs GITHUB_TOKEN in
env; every tool refuses cleanly if it's not set rather than raising. The
read-only tools work with a read-only PAT; create_github_repo additionally
needs write access (classic PAT `repo`/`public_repo` scope, or a fine-grained
PAT with the "Administration: read and write" account permission)."""
import requests
from config import GITHUB_TOKEN
from agent.tools.base import Tool

_API = "https://api.github.com"
_MAX_CHARS = 4000
_HEADERS = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}


def _gh_request(method: str, path: str, **kwargs) -> tuple[list | dict | None, str | None]:
    """Call the GitHub API. Returns (json, None) on success or (None, error_string)."""
    if not GITHUB_TOKEN:
        return None, "Error: GITHUB_TOKEN is not configured."
    try:
        r = requests.request(method, f"{_API}{path}", headers=_HEADERS, timeout=15, **kwargs)
    except Exception as e:
        return None, f"Error: {e}"
    if r.status_code >= 400:
        try:
            msg = r.json().get("message", r.text[:200])
        except Exception:
            msg = r.text[:200]
        return None, f"Error: GitHub API {r.status_code} — {msg}"
    return (r.json() if r.text else {}), None


def _gh_get(path: str, params: dict | None = None) -> tuple[list | dict | None, str | None]:
    return _gh_request("GET", path, params=params)


def _gh_post(path: str, json: dict | None = None) -> tuple[list | dict | None, str | None]:
    return _gh_request("POST", path, json=json)


def _render(lines: list[str], empty: str) -> str:
    return ("\n".join(lines) or empty)[:_MAX_CHARS]


_REPO_PROP = {"repo": {"type": "string", "description": "owner/repo, e.g. 'nasir/nasir.id'."}}


class CreateGithubRepoTool(Tool):
    name = "create_github_repo"
    description = (
        "Create a new GitHub repository owned by the authenticated token's user "
        "or, if 'org' is given, an organization the token has access to. This is "
        "a write action — it actually creates the repo, it does not ask for "
        "confirmation itself."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "name": {"type": "string", "description": "Repository name, e.g. 'test123'."},
            "org": {
                "type": "string",
                "description": "Organization login to create the repo under. Omit to "
                "create it under the authenticated user's own account.",
            },
            "private": {
                "type": "boolean",
                "description": "Whether the repo should be private. Default true.",
            },
            "description": {"type": "string", "description": "Optional repo description."},
            "auto_init": {
                "type": "boolean",
                "description": "Initialize with a README so the repo isn't empty. Default true.",
            },
        },
        "required": ["name"],
    }

    def run(
        self,
        name: str,
        org: str | None = None,
        private: bool = True,
        description: str | None = None,
        auto_init: bool = True,
    ) -> str:
        body = {"name": name, "private": private, "auto_init": auto_init}
        if description:
            body["description"] = description
        path = f"/orgs/{org}/repos" if org else "/user/repos"
        data, err = _gh_post(path, body)
        if err:
            return err
        return (
            f"Created {data['full_name']} "
            f"({'private' if data['private'] else 'public'}) — {data['html_url']}"
        )


class ListGithubRepositoriesTool(Tool):
    name = "list_github_repos"
    description = (
        "List GitHub repositories, sorted by most recently pushed (a useful proxy "
        "for 'most active'). Defaults to the authenticated token's own repos "
        "(including private ones it can see); pass 'owner' to list a specific "
        "user's or org's public repos instead."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "owner": {
                "type": "string",
                "description": "GitHub username or org to list repos for. Omit to list "
                "the authenticated token's own repos.",
            },
            "limit": {"type": "integer", "description": "Max repos, default 30, max 100."},
        },
        "required": [],
    }

    def run(self, owner: str | None = None, limit: int = 30) -> str:
        params = {"per_page": min(max(limit, 1), 100), "sort": "pushed", "direction": "desc"}
        if owner:
            path = f"/users/{owner}/repos"
        else:
            path = "/user/repos"
            params["affiliation"] = "owner,collaborator,organization_member"
        data, err = _gh_get(path, params)
        if err:
            return err
        lines = [
            f"{r['full_name']} — {'private' if r['private'] else 'public'} — "
            f"pushed {r['pushed_at']} — {r.get('language') or 'n/a'} — "
            f"★{r['stargazers_count']} — {r['html_url']}"
            for r in data
        ]
        header = f"{len(data)} repo(s), sorted by most recently pushed (index 0 = most active):"
        return f"{header}\n{_render(lines, 'No repositories found.')}"


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
