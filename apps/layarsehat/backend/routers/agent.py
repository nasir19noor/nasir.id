import secrets
from datetime import datetime, date, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_device
import models
import schemas

router = APIRouter(prefix="/agent", tags=["agent"])


def build_policy(device: models.Device, db: Session) -> schemas.AgentPolicy:
    """Daftar paket terblokir efektif untuk perangkat ini."""
    policies = db.query(models.AppPolicy).filter(models.AppPolicy.device_id == device.id).all()
    explicit = {p.package_name: p.status for p in policies}
    blocked = {pkg for pkg, status in explicit.items() if status == "blocked"}

    if device.default_policy == "block_new":
        # Aplikasi non-sistem tanpa aturan eksplisit ikut diblokir sampai disetujui.
        pending = (
            db.query(models.InstalledApp.package_name)
            .filter(
                models.InstalledApp.device_id == device.id,
                models.InstalledApp.is_system == False,  # noqa: E712
                models.InstalledApp.is_installed == True,  # noqa: E712
            )
            .all()
        )
        for (pkg,) in pending:
            if pkg not in explicit:
                blocked.add(pkg)

    return schemas.AgentPolicy(
        default_policy=device.default_policy,
        blocked_packages=sorted(blocked),
        daily_limit_minutes=device.daily_limit_minutes,
        bedtime_start=device.bedtime_start,
        bedtime_end=device.bedtime_end,
    )


@router.post("/pair", response_model=schemas.AgentPairResponse)
def pair(payload: schemas.AgentPairRequest, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    pairing = (
        db.query(models.PairingCode)
        .filter(
            models.PairingCode.code == payload.code.strip(),
            models.PairingCode.used == False,  # noqa: E712
            models.PairingCode.expires_at > now,
        )
        .order_by(models.PairingCode.id.desc())
        .first()
    )
    if not pairing:
        raise HTTPException(status_code=400, detail="Kode tidak valid atau sudah kedaluwarsa")

    child = db.query(models.Child).filter(models.Child.id == pairing.child_id).first()
    if not child:
        raise HTTPException(status_code=400, detail="Data anak tidak ditemukan")

    device = models.Device(
        child_id=child.id,
        device_name=payload.device_name or "Perangkat Android",
        brand=payload.brand,
        model=payload.model,
        android_version=payload.android_version,
        app_version=payload.app_version,
        device_token=secrets.token_urlsafe(32),
        last_seen=now,
    )
    pairing.used = True
    db.add(device)
    db.commit()
    db.refresh(device)

    return schemas.AgentPairResponse(
        device_id=device.id,
        device_token=device.device_token,
        child_name=child.name,
    )


@router.post("/sync", response_model=schemas.AgentSyncResponse)
def sync(
    payload: schemas.AgentSyncRequest,
    device: models.Device = Depends(get_current_device),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    device.last_seen = now
    if payload.app_version:
        device.app_version = payload.app_version

    # ── Aplikasi terpasang ──
    if payload.installed_apps:
        existing = {
            a.package_name: a
            for a in db.query(models.InstalledApp).filter(models.InstalledApp.device_id == device.id)
        }
        reported = set()
        for item in payload.installed_apps:
            reported.add(item.package_name)
            app = existing.get(item.package_name)
            if app:
                app.app_name = item.app_name or app.app_name
                app.version_name = item.version_name or app.version_name
                app.is_system = item.is_system
                app.is_installed = True
                app.last_seen = now
            else:
                db.add(
                    models.InstalledApp(
                        device_id=device.id,
                        package_name=item.package_name,
                        app_name=item.app_name,
                        version_name=item.version_name,
                        is_system=item.is_system,
                        last_seen=now,
                    )
                )
        # Tandai aplikasi yang tidak lagi dilaporkan sebagai ter-uninstall
        for pkg, app in existing.items():
            if pkg not in reported and app.is_installed:
                app.is_installed = False

    # ── Statistik pemakaian ──
    for item in payload.usage:
        usage_date = item.usage_date or date.today()
        row = (
            db.query(models.AppUsage)
            .filter(
                models.AppUsage.device_id == device.id,
                models.AppUsage.package_name == item.package_name,
                models.AppUsage.usage_date == usage_date,
            )
            .first()
        )
        if row:
            row.seconds = max(row.seconds or 0, item.seconds)
            row.app_name = item.app_name or row.app_name
        else:
            db.add(
                models.AppUsage(
                    device_id=device.id,
                    package_name=item.package_name,
                    app_name=item.app_name,
                    usage_date=usage_date,
                    seconds=item.seconds,
                )
            )

    db.commit()
    db.refresh(device)

    return schemas.AgentSyncResponse(policy=build_policy(device, db), server_time=now)


@router.get("/policy", response_model=schemas.AgentPolicy)
def get_policy(
    device: models.Device = Depends(get_current_device),
    db: Session = Depends(get_db),
):
    device.last_seen = datetime.now(timezone.utc)
    db.commit()
    return build_policy(device, db)
