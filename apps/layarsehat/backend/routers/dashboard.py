from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_parent
import models
import schemas

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# Perangkat dianggap masih aktif bila menyapa server dalam 30 menit terakhir.
AMBANG_AKTIF = timedelta(minutes=30)


@router.get("/summary", response_model=schemas.DashboardSummary)
def summary(
    days: int = 7,
    parent: models.Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    days = max(1, min(days, 30))

    children = db.query(models.Child).filter(models.Child.parent_id == parent.id).all()
    child_ids = [c.id for c in children]

    devices = (
        db.query(models.Device).filter(models.Device.child_id.in_(child_ids)).all()
        if child_ids
        else []
    )
    device_ids = [d.id for d in devices]

    if not device_ids:
        return schemas.DashboardSummary(
            children_count=len(children),
            devices_count=0,
            active_devices=0,
            blocked_apps=0,
            pending_apps=0,
            screen_time_today=0,
            screen_time_yesterday=0,
            days=_rentang_kosong(days),
            top_apps=[],
        )

    batas_aktif = datetime.now(timezone.utc) - AMBANG_AKTIF
    aktif = sum(
        1
        for d in devices
        if (terlihat := _dengan_zona(d.last_seen)) and terlihat >= batas_aktif
    )

    diblokir = (
        db.query(func.count(models.AppPolicy.id))
        .filter(
            models.AppPolicy.device_id.in_(device_ids),
            models.AppPolicy.status == "blocked",
        )
        .scalar()
        or 0
    )

    # Aplikasi yang menunggu persetujuan hanya ada pada perangkat bermode ketat.
    ketat_ids = [d.id for d in devices if d.default_policy == "block_new"]
    menunggu = 0
    if ketat_ids:
        menunggu = (
            db.query(func.count(models.InstalledApp.id))
            .outerjoin(
                models.AppPolicy,
                and_(
                    models.AppPolicy.device_id == models.InstalledApp.device_id,
                    models.AppPolicy.package_name == models.InstalledApp.package_name,
                ),
            )
            .filter(
                models.InstalledApp.device_id.in_(ketat_ids),
                models.InstalledApp.is_system == False,  # noqa: E712
                models.InstalledApp.is_installed == True,  # noqa: E712
                models.AppPolicy.id.is_(None),
            )
            .scalar()
            or 0
        )

    hari_ini = date.today()
    sejak = hari_ini - timedelta(days=days - 1)

    per_hari = dict(
        db.query(models.AppUsage.usage_date, func.sum(models.AppUsage.seconds))
        .filter(
            models.AppUsage.device_id.in_(device_ids),
            models.AppUsage.usage_date >= sejak,
        )
        .group_by(models.AppUsage.usage_date)
        .all()
    )

    teratas = (
        db.query(
            models.AppUsage.package_name,
            func.max(models.AppUsage.app_name),
            func.sum(models.AppUsage.seconds),
        )
        .filter(
            models.AppUsage.device_id.in_(device_ids),
            models.AppUsage.usage_date >= sejak,
        )
        .group_by(models.AppUsage.package_name)
        .order_by(func.sum(models.AppUsage.seconds).desc())
        .limit(6)
        .all()
    )

    return schemas.DashboardSummary(
        children_count=len(children),
        devices_count=len(devices),
        active_devices=aktif,
        blocked_apps=int(diblokir),
        pending_apps=int(menunggu),
        screen_time_today=int(per_hari.get(hari_ini, 0) or 0),
        screen_time_yesterday=int(per_hari.get(hari_ini - timedelta(days=1), 0) or 0),
        days=_rentang_kosong(days, per_hari),
        top_apps=[
            schemas.UsageApp(package_name=p, app_name=n, seconds=int(s or 0))
            for p, n, s in teratas
        ],
    )


def _dengan_zona(saat: datetime | None) -> datetime | None:
    """Waktu tanpa zona dianggap UTC agar bisa dibandingkan dengan aman."""
    if saat is None:
        return None
    return saat if saat.tzinfo else saat.replace(tzinfo=timezone.utc)


def _rentang_kosong(days: int, terisi: dict | None = None) -> list[schemas.UsageDay]:
    """Deret hari yang lengkap agar grafik tidak berlubang saat data kosong."""
    terisi = terisi or {}
    awal = date.today() - timedelta(days=days - 1)
    return [
        schemas.UsageDay(
            usage_date=awal + timedelta(days=i),
            total_seconds=int(terisi.get(awal + timedelta(days=i), 0) or 0),
        )
        for i in range(days)
    ]
