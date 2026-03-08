from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from routers import users, quiz, admin
from sqlalchemy import text
import os
import time
from user_agents import parse as parse_user_agent

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
        ("users",         "birth_date",     "DATE"),
        ("user_analytics", "user_id",       "INTEGER"),
        ("user_analytics", "ip_address",    "VARCHAR"),
        ("user_analytics", "user_agent",    "VARCHAR"),
        ("user_analytics", "os",            "VARCHAR"),
        ("user_analytics", "device",        "VARCHAR"),
        ("user_analytics", "browser",       "VARCHAR"),
        ("user_analytics", "location",      "VARCHAR"),
        ("user_analytics", "country",       "VARCHAR"),
        ("user_analytics", "city",          "VARCHAR"),
        ("user_analytics", "latitude",      "VARCHAR"),
        ("user_analytics", "longitude",     "VARCHAR"),
        ("user_analytics", "endpoint",      "VARCHAR"),
        ("user_analytics", "method",        "VARCHAR"),
        ("user_analytics", "status_code",   "INTEGER"),
        ("user_analytics", "response_time_ms", "INTEGER"),
        ("user_analytics", "created_at",    "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"),
    ]
    with engine.connect() as conn:
        for table, column, col_type in migrations:
            exists = conn.execute(
                text(
                    "SELECT 1 FROM information_schema.columns "
                    "WHERE table_name = :t AND column_name = :c"
                ),
                {"t": table, "c": column},
            ).fetchone()
            if not exists:
                conn.execute(text(
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
                text(
                    "SELECT 1 FROM information_schema.columns "
                    "WHERE table_name = :t AND column_name = :c AND is_nullable = 'NO'"
                ),
                {"t": table, "c": column},
            ).fetchone()
            if is_not_null:
                conn.execute(text(sql))
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

# Analytics middleware
async def analytics_middleware(request: Request, call_next):
    """Middleware to track user analytics."""
    start_time = time.time()
    
    try:
        # Get IP address
        ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if not ip:
            ip = request.client.host if request.client else None
        
        # Get User-Agent
        user_agent_str = request.headers.get("user-agent", "")
        user_agent = parse_user_agent(user_agent_str)
        
        # Parse UA info
        os_name = user_agent.os.family if user_agent.os else None
        device = user_agent.device.family if user_agent.device else None
        browser = user_agent.browser.family if user_agent.browser else None
        
        # Get user_id from token if available
        user_id = None
        try:
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                from auth import decode_token
                token_data = decode_token(auth_header[7:])
                user_id = token_data.user_id
        except:
            pass
        
        # Proceed with request
        response = await call_next(request)
        
        # Calculate response time
        response_time_ms = int((time.time() - start_time) * 1000)
        
        # Store analytics in background
        try:
            from models import UserAnalytics
            db = SessionLocal()
            try:
                analytics = UserAnalytics(
                    user_id=user_id,
                    ip_address=ip,
                    user_agent=user_agent_str,
                    os=os_name,
                    device=device,
                    browser=browser,
                    endpoint=request.url.path,
                    method=request.method,
                    status_code=response.status_code,
                    response_time_ms=response_time_ms
                )
                db.add(analytics)
                db.commit()
            finally:
                db.close()
        except Exception as e:
            print(f"Analytics tracking error: {e}")
        
        return response
    except Exception as e:
        print(f"Analytics middleware error: {e}")
        return await call_next(request)

app = FastAPI(title='iTung API', version='1.0.0')

# Add analytics middleware
app.middleware("http")(analytics_middleware)

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
