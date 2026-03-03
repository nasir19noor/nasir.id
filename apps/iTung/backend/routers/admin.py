from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import User
from auth import decode_token

router   = APIRouter()
security = HTTPBearer()


# ─── Auth helper ──────────────────────────────────────────────────

def require_admin(creds=Depends(security), db: Session = Depends(get_db)) -> User:
    token_data = decode_token(creds.credentials)
    user = db.query(User).filter(User.id == token_data.user_id).first()
    if not user or not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ─── Schemas ──────────────────────────────────────────────────────

class UserAdminView(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    phone_number: Optional[str]
    birth_date: Optional[date]
    is_active: bool
    is_admin: bool
    ai_access: bool

    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    is_active:  Optional[bool] = None
    is_admin:   Optional[bool] = None
    ai_access:  Optional[bool] = None


# ─── Endpoints ────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserAdminView])
def list_users(admin: User = Depends(require_admin),
               db: Session = Depends(get_db)):
    return db.query(User).order_by(User.id).all()


@router.patch("/users/{user_id}", response_model=UserAdminView)
def update_user(user_id: int,
                data: UserUpdateRequest,
                admin: User = Depends(require_admin),
                db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.is_active  is not None: user.is_active  = data.is_active
    if data.is_admin   is not None: user.is_admin   = data.is_admin
    if data.ai_access  is not None: user.ai_access  = data.ai_access
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int,
                admin: User = Depends(require_admin),
                db: Session = Depends(get_db)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Tidak bisa menghapus akun sendiri")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
