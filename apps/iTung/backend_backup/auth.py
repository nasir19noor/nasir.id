# auth.py
from datetime import datetime, timedelta
from typing import Optional
import os

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel
from cryptography.fernet import Fernet

# ─── Configuration ───────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

# ─── Encryption (for user API keys) ──────────────────────────────
_ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
_fernet: Optional[Fernet] = Fernet(_ENCRYPTION_KEY.encode()) if _ENCRYPTION_KEY else None


def encrypt_key(plain: str) -> str:
    if not _fernet:
        raise HTTPException(status_code=500, detail="Encryption not configured")
    return _fernet.encrypt(plain.encode()).decode()


def decrypt_key(cipher: str) -> str:
    if not _fernet:
        raise HTTPException(status_code=500, detail="Encryption not configured")
    return _fernet.decrypt(cipher.encode()).decode()

# ─── Setup ───────────────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="users/login")


# ─── Schemas ─────────────────────────────────────────────────────
class TokenData(BaseModel):
    user_id: Optional[int] = None
    username: Optional[str] = None


# ─── Password Helpers ─────────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


# ─── Token Helpers ────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        username: str = payload.get("username")
        if user_id is None:
            raise credentials_exception
        return TokenData(user_id=int(user_id), username=username)
    except JWTError:
        raise credentials_exception


# ─── Dependency ───────────────────────────────────────────────────
def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenData:
    return decode_token(token)