from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_parent
import models
import schemas

router = APIRouter(prefix="/devices", tags=["devices"])


def _get_owned_device(device_id: int, parent: models.Parent, db: Session) -> models.Device:
    device = (
        db.query(models.Device)
        .join(models.Child)
        .filter(models.Device.id == device_id, models.Child.parent_id == parent.id)
        .first()
    )
    if not device:
        raise HTTPException(status_code=404, detail="Perangkat tidak ditemukan")
    return device


@router.get("", response_model=list[schemas.DeviceOut])
def list_devices(
    parent: models.Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Device)
        .join(models.Child)
        .filter(models.Child.parent_id == parent.id, models.Device.is_active == True)  # noqa: E712
        .order_by(models.Device.id)
        .all()
    )


@router.get("/{device_id}", response_model=schemas.DeviceOut)
def get_device(
    device_id: int,
    parent: models.Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    return _get_owned_device(device_id, parent, db)


@router.delete("/{device_id}")
def delete_device(
    device_id: int,
    parent: models.Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    device = _get_owned_device(device_id, parent, db)
    db.delete(device)
    db.commit()
    return {"detail": "Perangkat dihapus"}


@router.put("/{device_id}/settings", response_model=schemas.DeviceOut)
def update_settings(
    device_id: int,
    payload: schemas.DeviceSettingsUpdate,
    parent: models.Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    device = _get_owned_device(device_id, parent, db)

    if payload.default_policy is not None:
        if payload.default_policy not in ("allow", "block_new"):
            raise HTTPException(status_code=400, detail="default_policy harus 'allow' atau 'block_new'")
        device.default_policy = payload.default_policy

    if payload.daily_limit_minutes is not None:
        device.daily_limit_minutes = None if payload.daily_limit_minutes < 0 else payload.daily_limit_minutes

    if payload.bedtime_start is not None:
        device.bedtime_start = payload.bedtime_start or None
    if payload.bedtime_end is not None:
        device.bedtime_end = payload.bedtime_end or None

    db.commit()
    db.refresh(device)
    return device


@router.get("/{device_id}/apps", response_model=list[schemas.AppOut])
def list_apps(
    device_id: int,
    parent: models.Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    device = _get_owned_device(device_id, parent, db)

    policies = {
        p.package_name: p.status
        for p in db.query(models.AppPolicy).filter(models.AppPolicy.device_id == device.id)
    }
    apps = (
        db.query(models.InstalledApp)
        .filter(models.InstalledApp.device_id == device.id)
        .order_by(models.InstalledApp.app_name)
        .all()
    )

    result = []
    for app in apps:
        status = policies.get(app.package_name)
        if status is None:
            # Tanpa aturan eksplisit: 'pending' saat mode block_new (butuh persetujuan),
            # selain itu dianggap diperbolehkan.
            status = "pending" if (device.default_policy == "block_new" and not app.is_system) else "allowed"
        result.append(
            schemas.AppOut(
                package_name=app.package_name,
                app_name=app.app_name,
                version_name=app.version_name,
                is_system=app.is_system,
                is_installed=app.is_installed,
                first_seen=app.first_seen,
                status=status,
            )
        )
    return result


@router.put("/{device_id}/apps/{package_name}", response_model=schemas.AppOut)
def set_app_policy(
    device_id: int,
    package_name: str,
    payload: schemas.AppPolicyUpdate,
    parent: models.Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    device = _get_owned_device(device_id, parent, db)
    if payload.status not in ("allowed", "blocked"):
        raise HTTPException(status_code=400, detail="status harus 'allowed' atau 'blocked'")

    policy = (
        db.query(models.AppPolicy)
        .filter(models.AppPolicy.device_id == device.id, models.AppPolicy.package_name == package_name)
        .first()
    )
    if policy:
        policy.status = payload.status
    else:
        policy = models.AppPolicy(device_id=device.id, package_name=package_name, status=payload.status)
        db.add(policy)
    db.commit()

    app = (
        db.query(models.InstalledApp)
        .filter(models.InstalledApp.device_id == device.id, models.InstalledApp.package_name == package_name)
        .first()
    )
    return schemas.AppOut(
        package_name=package_name,
        app_name=app.app_name if app else None,
        version_name=app.version_name if app else None,
        is_system=app.is_system if app else False,
        is_installed=app.is_installed if app else True,
        first_seen=app.first_seen if app else None,
        status=payload.status,
    )


@router.get("/{device_id}/usage", response_model=schemas.UsageReport)
def usage_report(
    device_id: int,
    days: int = 7,
    parent: models.Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    device = _get_owned_device(device_id, parent, db)
    days = max(1, min(days, 30))
    since = date.today() - timedelta(days=days - 1)

    per_day = (
        db.query(models.AppUsage.usage_date, func.sum(models.AppUsage.seconds))
        .filter(models.AppUsage.device_id == device.id, models.AppUsage.usage_date >= since)
        .group_by(models.AppUsage.usage_date)
        .order_by(models.AppUsage.usage_date)
        .all()
    )
    top_apps = (
        db.query(
            models.AppUsage.package_name,
            func.max(models.AppUsage.app_name),
            func.sum(models.AppUsage.seconds),
        )
        .filter(models.AppUsage.device_id == device.id, models.AppUsage.usage_date >= since)
        .group_by(models.AppUsage.package_name)
        .order_by(func.sum(models.AppUsage.seconds).desc())
        .limit(10)
        .all()
    )

    return schemas.UsageReport(
        days=[schemas.UsageDay(usage_date=d, total_seconds=int(s or 0)) for d, s in per_day],
        top_apps=[
            schemas.UsageApp(package_name=p, app_name=n, seconds=int(s or 0))
            for p, n, s in top_apps
        ],
    )
