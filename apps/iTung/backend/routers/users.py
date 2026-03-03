# routers/users.py
from datetime import timedelta, datetime, timezone, date
from typing import Optional, Literal
import os, random, requests

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
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
WAHA_URL         = os.getenv("WAHA_URL", "").rstrip("/")
WAHA_API_KEY     = os.getenv("WAHA_API_KEY", "")
WAHA_SESSION     = os.getenv("WAHA_SESSION", "default")


def normalize_phone(p: str) -> str:
    p = p.strip().replace(" ", "").replace("-", "")
    if p.startswith("0"):
        p = "62" + p[1:]
    elif not p.startswith("62"):
        p = "62" + p
    return p


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
    phone_number: Optional[str] = None
    otp_code: Optional[str] = None


class ApiKeyUpdate(BaseModel):
    key: str


class SendOtpRequest(BaseModel):
    phone: str


# ─── Router ───────────────────────────────────────────────────────
router = APIRouter(tags=["Users"])


@router.post("/send-otp", status_code=200)
def send_otp(data: SendOtpRequest, db: Session = Depends(get_db)):
    """Generate and send a WhatsApp OTP via WAHA."""
    if not WAHA_URL:
        raise HTTPException(status_code=500, detail="WhatsApp OTP tidak dikonfigurasi")
    phone = normalize_phone(data.phone)
    db.query(OtpCode).filter(OtpCode.phone == phone).delete()
    code = f"{random.randint(0, 999999):06d}"
    expires = datetime.now(timezone.utc) + timedelta(minutes=5)
    db.add(OtpCode(phone=phone, code=code, expires_at=expires))
    db.commit()
    try:
        headers = {"Content-Type": "application/json"}
        if WAHA_API_KEY:
            headers["X-Api-Key"] = WAHA_API_KEY
        resp = requests.post(
            f"{WAHA_URL}/api/sendText",
            headers=headers,
            json={
                "session": WAHA_SESSION,
                "chatId": f"{phone}@c.us",
                "text": f"Kode OTP iTung Anda: *{code}*\nBerlaku 5 menit. Jangan bagikan ke siapapun.",
            },
            timeout=15,
        )
        print(f"[WAHA] status={resp.status_code} body={resp.text[:200]}")
        if not resp.ok:
            raise HTTPException(status_code=502, detail=f"WAHA: {resp.text[:200]}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gagal mengirim OTP. ({e})")
    return {"message": "OTP telah dikirim ke WhatsApp Anda"}


@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user."""
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username sudah digunakan")

    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")

    phone = normalize_phone(data.phone_number)
    if db.query(User).filter(User.phone_number == phone).first():
        raise HTTPException(status_code=400, detail="Nomor HP sudah terdaftar")

    otp = db.query(OtpCode).filter(
        OtpCode.phone == phone,
        OtpCode.code == data.otp_code,
        OtpCode.expires_at > datetime.now(timezone.utc),
    ).first()
    if not otp:
        raise HTTPException(status_code=400, detail="Kode OTP tidak valid atau sudah kedaluwarsa")

    user = User(
        username=data.username,
        email=data.email,
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
def login(
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

    # Validate phone + OTP
    if not data.phone_number or not data.otp_code:
        raise HTTPException(status_code=400, detail="Nomor WhatsApp dan kode OTP wajib diisi")

    phone = normalize_phone(data.phone_number)
    if db.query(User).filter(User.phone_number == phone).first():
        raise HTTPException(status_code=400, detail="Nomor HP sudah terdaftar")

    otp = db.query(OtpCode).filter(
        OtpCode.phone == phone,
        OtpCode.code == data.otp_code,
        OtpCode.expires_at > datetime.now(timezone.utc),
    ).first()
    if not otp:
        raise HTTPException(status_code=400, detail="Kode OTP tidak valid atau sudah kedaluwarsa")

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
    db.delete(otp); db.commit()
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
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    file_bytes = await file.read()

    # Upload original to S3
    original_url = avatar_service.upload_original(file_bytes, user.id, file.content_type)
    user.avatar_url = original_url
    db.commit()

    # Generate cartoon locally using Pillow
    cartoon_url = avatar_service.generate_cartoon(file_bytes, user.id)
    if cartoon_url:
        user.cartoon_url = cartoon_url
        db.commit()

    db.refresh(user)
    return {"avatar_url": user.avatar_url, "cartoon_url": user.cartoon_url}
