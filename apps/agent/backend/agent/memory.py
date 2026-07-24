"""PostgreSQL memory. Messages are stored as JSONB in exactly the shape Bedrock
expects, so a conversation can be reloaded and continued verbatim."""
import json
import psycopg2
from config import DATABASE_URL


class Memory:
    def __init__(self, db_url: str = DATABASE_URL):
        self.db_url = db_url

    def _conn(self):
        return psycopg2.connect(self.db_url)

    def healthy(self) -> bool:
        try:
            with self._conn() as conn, conn.cursor() as cur:
                cur.execute("SELECT 1")
            return True
        except Exception:
            return False

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
            return [{"role": r, "content": c} for r, c in cur.fetchall()]
