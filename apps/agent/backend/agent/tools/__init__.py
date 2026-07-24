"""Tool registry. Add a class here and the agent + Bedrock both see it."""
from agent.tools.shell import ShellTool
from agent.tools.postgres import PostgresQueryTool
from agent.tools.aws_tools import ListEC2Tool, ListS3Tool, TailLogsTool
from agent.tools.http_fetch import HttpFetchTool


def build_registry() -> dict:
    tools = [
        ShellTool(),
        PostgresQueryTool(),
        ListEC2Tool(),
        ListS3Tool(),
        TailLogsTool(),
        HttpFetchTool(),
    ]
    return {t.name: t for t in tools}


def build_tool_config(registry: dict) -> dict:
    return {"tools": [t.spec() for t in registry.values()]}
