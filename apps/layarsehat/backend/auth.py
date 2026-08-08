# auth.py
from datetime import datetime, timedelta
from typing import Optional
import os

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import bcrypt
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
import models

# ─── Configuration ───────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="parents/login")


# ─── Password Helpers ────────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


# ─── Token Helpers ───────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ─── Dependencies ────────────────────────────────────────────────
def get_current_parent(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.Parent:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesi tidak valid, silakan masuk kembali",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        parent_id = payload.get("sub")
        if parent_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    parent = db.query(models.Parent).filter(models.Parent.id == int(parent_id)).first()
    if parent is None or not parent.is_active:
        raise credentials_exception
    return parent


def get_current_device(
    x_device_token: str = Header(...),
    db: Session = Depends(get_db),
) -> models.Device:
    device = (
        db.query(models.Device)
        .filter(models.Device.device_token == x_device_token, models.Device.is_active == True)  # noqa: E712
        .first()
    )
    if device is None:
        raise HTTPException(status_code=401, detail="Perangkat tidak dikenal")
    return device
