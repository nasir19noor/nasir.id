from fastapi import FastAPI, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from database import engine, Base, SessionLocal
from routers import users, quiz, admin
from sqlalchemy import text
import os
import time
from user_agents import parse as parse_user_agent
import requests
from functools import lru_cache
from threading import Thread

limiter = Limiter(key_func=get_remote_address)

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
        ("user_analytics", "referrer",      "VARCHAR"),
        ("user_analytics", "source",        "VARCHAR"),
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

# GeoIP caching
@lru_cache(maxsize=1000)
def get_geoip_data(ip: str) -> dict:
    """Get geolocation data from IP address using ip-api.com."""
    try:
        # Skip for localhost
        if ip in ['127.0.0.1', 'localhost', '::1']:
            return {'country': 'Local', 'city': 'Localhost', 'latitude': '0', 'longitude': '0'}
        
        response = requests.get(
            f'http://ip-api.com/json/{ip}',
            timeout=3,
            params={'fields': 'country,city,lat,lon,status'}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                return {
                    'country': data.get('country', 'Unknown'),
                    'city': data.get('city', 'Unknown'),
                    'latitude': str(data.get('lat', '0')),
                    'longitude': str(data.get('lon', '0'))
                }
    except Exception as e:
        print(f"GeoIP lookup error for {ip}: {e}")
    
    return {'country': 'Unknown', 'city': 'Unknown', 'latitude': '0', 'longitude': '0'}


def update_analytics_with_location(analytics_id: int):
    """Background task to update analytics with geolocation data."""
    from models import UserAnalytics
    db = SessionLocal()
    try:
        analytics = db.query(UserAnalytics).filter(UserAnalytics.id == analytics_id).first()
        if analytics and analytics.ip_address:
            geo_data = get_geoip_data(analytics.ip_address)
            analytics.country = geo_data['country']
            analytics.city = geo_data['city']
            analytics.latitude = geo_data['latitude']
            analytics.longitude = geo_data['longitude']
            db.commit()
    except Exception as e:
        print(f"Error updating location for analytics {analytics_id}: {e}")
    finally:
        db.close()
async def analytics_middleware(request: Request, call_next):
    """Middleware to track user analytics."""
    start_time = time.time()
    
    # Log all requests for debugging
    if "/me/avatar" in request.url.path:
        print(f"[middleware] {request.method} {request.url.path} - Content-Type: {request.headers.get('content-type')}")
    
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
        
        # Get referrer
        referrer = request.headers.get("referer", "")
        source = extract_source_from_referrer(referrer)
        
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
                    referrer=referrer if referrer else None,
                    source=source,
                    endpoint=request.url.path,
                    method=request.method,
                    status_code=response.status_code,
                    response_time_ms=response_time_ms
                )
                db.add(analytics)
                db.commit()
                db.refresh(analytics)
                analytics_id = analytics.id
                
                # Update location in background
                if ip and ip not in ['127.0.0.1', 'localhost', '::1']:
                    thread = Thread(target=update_analytics_with_location, args=(analytics_id,), daemon=True)
                    thread.start()
            finally:
                db.close()
        except Exception as e:
            print(f"Analytics tracking error: {e}")
        
        return response
    except Exception as e:
        print(f"Analytics middleware error: {e}")
        return await call_next(request)


def extract_source_from_referrer(referrer: str) -> str | None:
    """Extract source platform from referrer URL."""
    if not referrer:
        return None
    
    referrer_lower = referrer.lower()
    
    # Social media and popular platforms
    sources = {
        'twitter': 'twitter.com',
        'x.com': 'twitter.com',
        'facebook': 'facebook.com',
        'fb.com': 'facebook.com',
        'instagram': 'instagram.com',
        'tiktok': 'tiktok.com',
        'linkedin': 'linkedin.com',
        'reddit': 'reddit.com',
        'youtube': 'youtube.com',
        'whatsapp': 'whatsapp',
        'telegram': 'telegram',
        'discord': 'discord.com',
        'pinterest': 'pinterest.com',
        'snapchat': 'snapchat.com',
        'viber': 'viber',
        'signal': 'signal',
        'google': 'google.com',
        'bing': 'bing.com',
        'baidu': 'baidu.com',
        'github': 'github.com',
        'stackoverflow': 'stackoverflow.com',
        'medium': 'medium.com',
        'dev.to': 'dev.to',
        'hashnode': 'hashnode.com',
    }
    
    for platform, domain in sources.items():
        if domain in referrer_lower:
            return platform
    
    # If not a known platform, try to extract domain name
    try:
        from urllib.parse import urlparse
        parsed = urlparse(referrer)
        domain = parsed.netloc.replace('www.', '')
        return domain if domain else 'direct'
    except:
        pass
    
    return 'direct'

app = FastAPI(title='iTung API', version='1.0.0')
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)



# Add analytics middleware
app.middleware("http")(analytics_middleware)

app.add_middleware(CORSMiddleware,
                   allow_origins=[
                       "https://itung.nasir.id",
                   ],
                   allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
                   allow_headers=["Authorization", "Content-Type"],
                   allow_credentials=True)

app.include_router(users.router,  prefix="/api/users",  tags=["users"])
app.include_router(quiz.router,   prefix="/api/quiz",   tags=["quiz"])
app.include_router(admin.router,  prefix="/api/admin",  tags=["admin"])




@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Catch validation errors and log them."""
    print(f"[VALIDATION_ERROR] {request.method} {request.url.path}")
    print(f"[VALIDATION_ERROR] Errors: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": "Invalid request data"},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Catch all exceptions and log them."""
    print(f"[GENERAL_ERROR] {request.method} {request.url.path}")
    print(f"[GENERAL_ERROR] {type(exc).__name__}: {exc}")
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/")
def root():
    return {'app': 'iTung API', 'status': 'running'}
