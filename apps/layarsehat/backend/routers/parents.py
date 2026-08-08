from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from auth import hash_password, verify_password, create_access_token, get_current_parent
import models
import schemas

router = APIRouter(prefix="/parents", tags=["parents"])


@router.post("/register", response_model=schemas.Token)
def register(payload: schemas.ParentRegister, db: Session = Depends(get_db)):
    existing = db.query(models.Parent).filter(models.Parent.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")

    parent = models.Parent(
        email=payload.email.lower(),
        full_name=payload.full_name,
        phone_number=payload.phone_number,
        hashed_password=hash_password(payload.password),
    )
    db.add(parent)
    db.commit()
    db.refresh(parent)

    token = create_access_token({"sub": str(parent.id)})
    return schemas.Token(access_token=token, parent=parent)


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.ParentLogin, db: Session = Depends(get_db)):
    parent = db.query(models.Parent).filter(models.Parent.email == payload.email.lower()).first()
    if not parent or not verify_password(payload.password, parent.hashed_password):
        raise HTTPException(status_code=401, detail="Email atau kata sandi salah")
    if not parent.is_active:
        raise HTTPException(status_code=403, detail="Akun dinonaktifkan")

    token = create_access_token({"sub": str(parent.id)})
    return schemas.Token(access_token=token, parent=parent)


@router.get("/me", response_model=schemas.ParentOut)
def me(parent: models.Parent = Depends(get_current_parent)):
    return parent
