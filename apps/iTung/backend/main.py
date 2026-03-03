from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from routers import users, quiz, admin
import os

Base.metadata.create_all(bind=engine)


def run_migrations():
    """Add columns that exist in models but are missing from the live DB tables."""
    migrations = [
        # (table, column, sql_type_with_default)
        ("users",         "full_name",      "VARCHAR"),
        ("users",         "is_active",      "BOOLEAN NOT NULL DEFAULT TRUE"),
        ("users",         "updated_at",     "TIMESTAMPTZ"),
        ("quiz_sessions", "score",          "INTEGER NOT NULL DEFAULT 0"),
        ("quiz_sessions", "completed",      "BOOLEAN NOT NULL DEFAULT FALSE"),
        ("quiz_sessions", "use_ai",         "BOOLEAN NOT NULL DEFAULT TRUE"),
        ("quiz_sessions", "include_images", "BOOLEAN NOT NULL DEFAULT FALSE"),
        ("quiz_sessions", "client",         "VARCHAR DEFAULT 'web'"),
        ("questions",     "bank_question_id","INTEGER"),
        ("questions",     "source",         "VARCHAR DEFAULT 'ai'"),
        ("questions",     "order_number",   "INTEGER"),
        ("questions",     "image_url",      "VARCHAR"),
        ("user_answers",  "time_seconds",   "INTEGER"),
        ("users",         "is_admin",       "BOOLEAN NOT NULL DEFAULT FALSE"),
        ("users",         "ai_access",      "BOOLEAN NOT NULL DEFAULT FALSE"),
        ("users",         "google_id",      "VARCHAR"),
        ("users",         "phone_number",   "VARCHAR"),
        ("users",         "claude_api_key", "TEXT"),
        ("users",         "gemini_api_key", "TEXT"),
        ("users",         "avatar_url",     "VARCHAR"),
        ("users",         "cartoon_url",    "VARCHAR"),
    ]
    with engine.connect() as conn:
        for table, column, col_type in migrations:
            exists = conn.execute(
                __import__('sqlalchemy').text(
                    "SELECT 1 FROM information_schema.columns "
                    "WHERE table_name = :t AND column_name = :c"
                ),
                {"t": table, "c": column},
            ).fetchone()
            if not exists:
                conn.execute(__import__('sqlalchemy').text(
                    f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS {column} {col_type}'
                ))
                print(f"  Migration: added {column} to {table}")
        conn.commit()

    # Constraint-change migrations (idempotent ALTER COLUMN)
    constraint_changes = [
        # Make hashed_password nullable so Google-only accounts can be created
        ("users", "hashed_password",
         "ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL"),
    ]
    with engine.connect() as conn:
        for table, column, sql in constraint_changes:
            # Only run if column is currently NOT NULL
            is_not_null = conn.execute(
                __import__('sqlalchemy').text(
                    "SELECT 1 FROM information_schema.columns "
                    "WHERE table_name = :t AND column_name = :c AND is_nullable = 'NO'"
                ),
                {"t": table, "c": column},
            ).fetchone()
            if is_not_null:
                conn.execute(__import__('sqlalchemy').text(sql))
                print(f"  Migration: dropped NOT NULL on {table}.{column}")
        conn.commit()


run_migrations()


def seed_admin():
    """Grant admin + ai_access to the user named in ADMIN_USERNAME env var."""
    admin_username = os.getenv("ADMIN_USERNAME")
    if not admin_username:
        return
    from models import User
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == admin_username).first()
        if user and not user.is_admin:
            user.is_admin  = True
            user.ai_access = True
            db.commit()
            print(f"  Admin: granted admin+ai_access to '{admin_username}'")
    finally:
        db.close()


seed_admin()

app = FastAPI(title='iTung API', version='1.0.0')


app.add_middleware(CORSMiddleware,
                   allow_origins=[
                       "https://itung.nasir.id",
                       "http://207.180.248.214",
                       "http://118.99.110.211",
                       "http://localhost:5000",
                       "http://localhost:3000",
                       "http://localhost:3001",
                   ],
                   allow_methods=["*"],
                   allow_headers=["*"],
                   allow_credentials=True)

app.include_router(users.router,  prefix="/api/users",  tags=["users"])
app.include_router(quiz.router,   prefix="/api/quiz",   tags=["quiz"])
app.include_router(admin.router,  prefix="/api/admin",  tags=["admin"])

@app.get("/")
def root():
    return {'app': 'iTung API', 'status': 'running'}
