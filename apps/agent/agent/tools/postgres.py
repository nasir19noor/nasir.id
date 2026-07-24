"""Read-only SQL access to the local PostgreSQL. SELECT statements only; any
write/DDL keyword is refused before the query ever reaches the database."""
import psycopg2
from config import DATABASE_URL
from agent.tools.base import Tool

_FORBIDDEN = (
    "insert", "update", "delete", "drop", "alter",
    "truncate", "create", "grant", "revoke", "copy",
)


class PostgresQueryTool(Tool):
    name = "query_postgres"
    description = "Run a read-only SELECT query against the local PostgreSQL database."
    input_schema = {
        "type": "object",
        "properties": {
            "sql": {"type": "string", "description": "A single SELECT statement."}
        },
        "required": ["sql"],
    }

    def run(self, sql: str) -> str:
        lowered = sql.strip().lower().rstrip(";")
        if not lowered.startswith("select"):
            return "Refused: only SELECT queries are allowed."
        if any(word in lowered.split() for word in _FORBIDDEN):
            return "Refused: query contains a forbidden keyword."
        try:
            with psycopg2.connect(DATABASE_URL) as conn, conn.cursor() as cur:
                cur.execute(sql)
                cols = [d[0] for d in cur.description]
                rows = cur.fetchmany(50)
            lines = [" | ".join(cols)]
            lines += [" | ".join(str(c) for c in r) for r in rows]
            return "\n".join(lines)[:4000]
        except Exception as e:
            return f"Error: {e}"
