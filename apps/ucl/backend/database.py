"""SQLAlchemy engine + session for the ucl backend."""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")

# Managed Postgres providers usually require SSL; allow opt-out via env.
# sslmode is Postgres-specific — omit it for sqlite (local dev/tests).
connect_args = (
    {"sslmode": os.getenv("DB_SSLMODE", "require")}
    if DATABASE_URL.startswith("postgres") else {}
)

engine       = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base         = declarative_base()


def ensure_database() -> None:
    """Create the target database if it doesn't exist yet.

    Postgres on the deploy box is only reachable from the server itself, so
    the app bootstraps its own database on first start: if connecting fails
    with "database ... does not exist", connect to the maintenance 'postgres'
    database with the same credentials and CREATE DATABASE. Idempotent."""
    from sqlalchemy import text
    from sqlalchemy.exc import OperationalError

    try:
        with engine.connect():
            return  # database exists
    except OperationalError as e:
        if "does not exist" not in str(e):
            raise

    dbname = DATABASE_URL.rsplit("/", 1)[-1].split("?")[0]
    admin_url = DATABASE_URL.rsplit("/", 1)[0] + "/postgres"
    admin = create_engine(admin_url, connect_args=connect_args,
                          isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(text(f'CREATE DATABASE "{dbname}"'))
    admin.dispose()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
