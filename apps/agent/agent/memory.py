"""PostgreSQL-backed memory. Each message (including tool calls and results) is
stored as a JSONB block list, exactly in the shape Bedrock expects, so a
conversation can be reloaded and continued."""
import json
import psycopg2
from config import DATABASE_URL


class Memory:
    def __init__(self, db_url: str = DATABASE_URL):
        self.db_url = db_url

    def _conn(self):
        return psycopg2.connect(self.db_url)

    def create_conversation(self, title: str = "session") -> int:
        with self._conn() as conn, conn.cursor() as cur:
            cur.execute(
                "INSERT INTO conversations (title) VALUES (%s) RETURNING id", (title,)
            )
            return cur.fetchone()[0]

    def save_message(self, conversation_id: int, role: str, content: list) -> None:
        with self._conn() as conn, conn.cursor() as cur:
            cur.execute(
                "INSERT INTO messages (conversation_id, role, content) "
                "VALUES (%s, %s, %s)",
                (conversation_id, role, json.dumps(content)),
            )

    def load_messages(self, conversation_id: int) -> list:
        with self._conn() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT role, content FROM messages "
                "WHERE conversation_id = %s ORDER BY id",
                (conversation_id,),
            )
            return [
                {"role": role, "content": content}  # content already parsed from JSONB
                for role, content in cur.fetchall()
            ]
