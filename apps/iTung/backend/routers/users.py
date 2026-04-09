# routers/users.py
from datetime import timedelta, datetime, timezone, date
from typing import Optional, Literal
import os, random, requests, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

from fastapi import APIRouter, Depends, HTTPException, Request, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from database import get_db
from models import User, OtpCode
from services import avatar_service
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    encrypt_key,
    decrypt_key,
    TokenData,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

SMTP_HOST     = os.getenv("SMTP_HOST", "")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM     = os.getenv("SMTP_FROM", SMTP_USERNAME)


def normalize_phone(p: str) -> str:
    p = p.strip().replace(" ", "").replace("-", "")
    if p.startswith("0"):
        p = "62" + p[1:]
    elif not p.startswith("62"):
        p = "62" + p
    return p


def send_email_otp(to_email: str, code: str) -> None:
    """Send OTP code via SMTP email."""
    if not SMTP_HOST or not SMTP_USERNAME or not SMTP_PASSWORD:
        raise HTTPException(status_code=500, detail="Email OTP tidak dikonfigurasi")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Kode OTP iTung: {code}"
    msg["From"]    = SMTP_FROM
    msg["To"]      = to_email

    body = (
        f"Kode OTP iTung Anda: {code}\n"
        "Berlaku 5 menit. Jangan bagikan ke siapapun."
    )
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
            smtp.sendmail(SMTP_FROM, to_email, msg.as_string())
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gagal mengirim OTP ke email. ({e})")


# ─── Pydantic Schemas ─────────────────────────────────────────────
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str
    phone_number: str
    otp_code: str
    birth_date: date


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    phone_number: Optional[str]
    is_active: bool
    is_admin: bool
    ai_access: bool
    birth_date: Optional[date] = None
    avatar_url: Optional[str] = None
    cartoon_url: Optional[str] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    birth_date: Optional[date] = None


class GoogleCallbackRequest(BaseModel):
    id_token: str
    username: Optional[str] = None
    full_name: Optional[str] = None
    birth_date: Optional[date] = None
    phone_number: Optional[str] = None   # required when creating a new user


class ApiKeyUpdate(BaseModel):
    key: str


class SendOtpRequest(BaseModel):
    email: EmailStr


# ─── Router ───────────────────────────────────────────────────────
router = APIRouter(tags=["Users"])


@router.post("/send-otp", status_code=200)
@limiter.limit("3/minute")
def send_otp(request: Request, data: SendOtpRequest, db: Session = Depends(get_db)):
    """Generate and send an email OTP."""
    email = data.email.lower().strip()
    db.query(OtpCode).filter(OtpCode.phone == email).delete()
    code = f"{random.randint(0, 999999):06d}"
    expires = datetime.now(timezone.utc) + timedelta(minutes=5)
    db.add(OtpCode(phone=email, code=code, expires_at=expires))
    db.commit()
    send_email_otp(email, code)
    return {"message": "OTP telah dikirim ke email Anda"}


@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user."""
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username sudah digunakan")

    email = data.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")

    # Verify email OTP
    otp = db.query(OtpCode).filter(
        OtpCode.phone == email,
        OtpCode.code == data.otp_code,
        OtpCode.expires_at > datetime.now(timezone.utc),
    ).first()
    if not otp:
        raise HTTPException(status_code=400, detail="Kode OTP tidak valid atau sudah kedaluwarsa")

    phone = normalize_phone(data.phone_number)
    if db.query(User).filter(User.phone_number == phone).first():
        raise HTTPException(status_code=400, detail="Nomor HP sudah terdaftar")

    user = User(
        username=data.username,
        email=email,
        full_name=data.full_name,
        phone_number=phone,
        hashed_password=hash_password(data.password),
        birth_date=data.birth_date,
    )
    db.add(user)
    db.commit()
    db.delete(otp)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Login and get access token."""
    user = db.query(User).filter(User.username == form_data.username).first()

    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated")

    token = create_access_token(
        data={"sub": str(user.id), "username": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/google-login")
def google_login(data: GoogleCallbackRequest, db: Session = Depends(get_db)):
    """Sign in or register via Google OAuth ID token."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    try:
        info = google_id_token.verify_oauth2_token(
            data.id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {e}")

    google_id  = info["sub"]
    email      = info.get("email", "")
    name       = info.get("name", "")

    # 1. Existing user by google_id → login
    user = db.query(User).filter(User.google_id == google_id).first()
    if user:
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Account is deactivated")
        token = create_access_token({"sub": str(user.id), "username": user.username})
        return {"access_token": token, "token_type": "bearer", "user": user}

    # 2. Existing user by email → link google_id and login
    user = db.query(User).filter(User.email == email).first()
    if user:
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Account is deactivated")
        user.google_id = google_id
        db.commit(); db.refresh(user)
        token = create_access_token({"sub": str(user.id), "username": user.username})
        return {"access_token": token, "token_type": "bearer", "user": user}

    # 3. New user — need username
    if not data.username:
        return {
            "needs_username": True,
            "google_email": email,
            "google_name": name,
        }

    # Validate username
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    if not data.phone_number:
        raise HTTPException(status_code=400, detail="Nomor WhatsApp wajib diisi")

    phone = normalize_phone(data.phone_number)
    if db.query(User).filter(User.phone_number == phone).first():
        raise HTTPException(status_code=400, detail="Nomor HP sudah terdaftar")

    user = User(
        username=data.username,
        email=email,
        full_name=data.full_name or name or None,
        hashed_password=None,
        google_id=google_id,
        birth_date=data.birth_date,
        phone_number=phone,
    )
    db.add(user); db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id), "username": user.username})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current logged-in user profile."""
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/me", response_model=UserResponse)
def update_me(
    data: UserUpdate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current user's profile."""
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.email is not None:
        existing = db.query(User).filter(User.email == data.email, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = data.email
    if data.birth_date is not None:
        user.birth_date = data.birth_date

    db.commit()
    db.refresh(user)
    return user


@router.delete("/me", status_code=204)
def delete_me(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deactivate current user account."""
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    db.commit()


# ─── API Key Endpoints ────────────────────────────────────────────

def _mask(cipher: Optional[str]) -> Optional[str]:
    """Return last-4-chars preview of the decrypted key, or None."""
    if not cipher:
        return None
    try:
        plain = decrypt_key(cipher)
        return f"****...{plain[-4:]}" if len(plain) >= 4 else "****"
    except Exception:
        return "****"


@router.get("/me/api-keys")
def get_api_keys(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return masked API key info for the current user."""
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "claude": {"has_key": bool(user.claude_api_key), "preview": _mask(user.claude_api_key)},
        "gemini": {"has_key": bool(user.gemini_api_key), "preview": _mask(user.gemini_api_key)},
    }


@router.put("/me/api-keys/{provider}", status_code=204)
def update_api_key(
    provider: Literal["claude", "gemini"],
    data: ApiKeyUpdate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save or replace an API key for the current user."""
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    encrypted = encrypt_key(data.key.strip())
    if provider == "claude":
        user.claude_api_key = encrypted
    else:
        user.gemini_api_key = encrypted
    db.commit()


@router.delete("/me/api-keys/{provider}", status_code=204)
def delete_api_key(
    provider: Literal["claude", "gemini"],
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a saved API key."""
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if provider == "claude":
        user.claude_api_key = None
    else:
        user.gemini_api_key = None
    db.commit()


# ─── Avatar Endpoints ─────────────────────────────────────────────

@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a profile photo and generate an AI cartoon version."""
    print(f"[ENDPOINT] upload_avatar called for user {current_user.user_id}")
    print(f"[FILE] filename={file.filename}, content_type={file.content_type}, size=unknown")
    
    try:
        if not file.content_type or not file.content_type.startswith("image/"):
            print(f"[VALIDATION] Invalid content type: {file.content_type}")
            raise HTTPException(status_code=400, detail="File must be an image")

        user = db.query(User).filter(User.id == current_user.user_id).first()
        if not user:
            print(f"[DB] User not found: {current_user.user_id}")
            raise HTTPException(status_code=404, detail="User not found")

        print(f"[FILE_READ] Reading file bytes...")
        file_bytes = await file.read()
        print(f"[FILE_READ] Success, size: {len(file_bytes)} bytes")
        
        print(f"[avatar] Starting upload for user {user.id}, file size: {len(file_bytes)} bytes")

        # Upload original to S3
        print(f"[S3] Uploading original image...")
        original_url = avatar_service.upload_original(file_bytes, user.id, file.content_type)
        if not original_url:
            print("[avatar] upload_original returned None")
            raise HTTPException(status_code=500, detail="Failed to upload original image")
        
        user.avatar_url = original_url
        db.commit()
        print(f"[avatar] Original uploaded: {original_url}")

        # Calculate age from birth_date
        age = None
        if user.birth_date:
            from datetime import date
            today = date.today()
            age = today.year - user.birth_date.year
            if (today.month, today.day) < (user.birth_date.month, user.birth_date.day):
                age -= 1

        # Generate cartoon using Gemini with user age info
        print(f"[avatar] Generating cartoon for user {user.id}, age={age}")
        cartoon_url = avatar_service.generate_cartoon(file_bytes, user.id, age=age, race="Asian")
        if cartoon_url:
            user.cartoon_url = cartoon_url
            db.commit()
            print(f"[avatar] Cartoon generated: {cartoon_url}")
        else:
            print("[avatar] Cartoon generation returned None (skipped)")

        db.refresh(user)
        result = {"avatar_url": user.avatar_url, "cartoon_url": user.cartoon_url}
        print(f"[RESPONSE] Success: {result}")
        return result
    
    except HTTPException as e:
        print(f"[ERROR] HTTPException: {e.status_code} - {e.detail}")
        raise
    except Exception as e:
        print(f"[ERROR] Unexpected error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Gagal mengunggah foto. Coba lagi.")
