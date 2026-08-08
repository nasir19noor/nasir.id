import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database import get_db
from auth import get_current_parent
import models
import schemas

router = APIRouter(prefix="/children", tags=["children"])

PAIRING_CODE_TTL_MINUTES = 15


def _get_owned_child(child_id: int, parent: models.Parent, db: Session) -> models.Child:
    child = (
        db.query(models.Child)
        .filter(models.Child.id == child_id, models.Child.parent_id == parent.id)
        .first()
    )
    if not child:
        raise HTTPException(status_code=404, detail="Data anak tidak ditemukan")
    return child


@router.get("", response_model=list[schemas.ChildOut])
def list_children(
    parent: models.Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Child)
        .options(joinedload(models.Child.devices))
        .filter(models.Child.parent_id == parent.id)
        .order_by(models.Child.id)
        .all()
    )


@router.post("", response_model=schemas.ChildOut)
def create_child(
    payload: schemas.ChildCreate,
    parent: models.Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    child = models.Child(parent_id=parent.id, name=payload.name.strip(), birth_year=payload.birth_year)
    db.add(child)
    db.commit()
    db.refresh(child)
    return child


@router.delete("/{child_id}")
def delete_child(
    child_id: int,
    parent: models.Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    child = _get_owned_child(child_id, parent, db)
    db.delete(child)
    db.commit()
    return {"detail": "Data anak dihapus"}


@router.post("/{child_id}/pairing-code", response_model=schemas.PairingCodeOut)
def create_pairing_code(
    child_id: int,
    parent: models.Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    child = _get_owned_child(child_id, parent, db)

    code = f"{random.SystemRandom().randint(0, 999999):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=PAIRING_CODE_TTL_MINUTES)

    pairing = models.PairingCode(child_id=child.id, code=code, expires_at=expires_at)
    db.add(pairing)
    db.commit()

    return schemas.PairingCodeOut(code=code, expires_at=expires_at)
