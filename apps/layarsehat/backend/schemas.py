# schemas.py
from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


# ─── Parents ─────────────────────────────────────────────────────
class ParentRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: Optional[str] = None
    phone_number: Optional[str] = None


class ParentLogin(BaseModel):
    email: EmailStr
    password: str


class ParentOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str]
    phone_number: Optional[str]

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    parent: ParentOut


# ─── Children ────────────────────────────────────────────────────
class ChildCreate(BaseModel):
    name: str = Field(min_length=1)
    birth_year: Optional[int] = None


class DeviceOut(BaseModel):
    id: int
    device_name: str
    brand: Optional[str]
    model: Optional[str]
    android_version: Optional[str]
    default_policy: str
    daily_limit_minutes: Optional[int]
    bedtime_start: Optional[str]
    bedtime_end: Optional[str]
    last_seen: Optional[datetime]

    class Config:
        from_attributes = True


class ChildOut(BaseModel):
    id: int
    name: str
    birth_year: Optional[int]
    devices: List[DeviceOut] = []

    class Config:
        from_attributes = True


class PairingCodeOut(BaseModel):
    code: str
    expires_at: datetime


# ─── Device settings / policy ────────────────────────────────────
class DeviceSettingsUpdate(BaseModel):
    default_policy: Optional[str] = None          # 'allow' | 'block_new'
    daily_limit_minutes: Optional[int] = None     # -1 untuk menghapus batas
    bedtime_start: Optional[str] = None           # "" untuk menghapus
    bedtime_end: Optional[str] = None


class AppPolicyUpdate(BaseModel):
    status: str  # 'allowed' | 'blocked'


class AppOut(BaseModel):
    package_name: str
    app_name: Optional[str]
    version_name: Optional[str]
    is_system: bool
    is_installed: bool
    first_seen: Optional[datetime]
    status: str  # 'allowed' | 'blocked' | 'pending'


class UsageDay(BaseModel):
    usage_date: date
    total_seconds: int


class UsageApp(BaseModel):
    package_name: str
    app_name: Optional[str]
    seconds: int


class UsageReport(BaseModel):
    days: List[UsageDay]
    top_apps: List[UsageApp]


# ─── Agent (child device) ────────────────────────────────────────
class AgentPairRequest(BaseModel):
    code: str
    device_name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    android_version: Optional[str] = None
    app_version: Optional[str] = None


class AgentPairResponse(BaseModel):
    device_id: int
    device_token: str
    child_name: str


class AgentInstalledApp(BaseModel):
    package_name: str
    app_name: Optional[str] = None
    version_name: Optional[str] = None
    is_system: bool = False


class AgentUsageItem(BaseModel):
    package_name: str
    app_name: Optional[str] = None
    seconds: int = 0
    usage_date: Optional[date] = None  # default: hari ini (WIB dikirim dari perangkat)


class AgentSyncRequest(BaseModel):
    installed_apps: List[AgentInstalledApp] = []
    usage: List[AgentUsageItem] = []
    app_version: Optional[str] = None


class AgentPolicy(BaseModel):
    default_policy: str
    blocked_packages: List[str]
    daily_limit_minutes: Optional[int]
    bedtime_start: Optional[str]
    bedtime_end: Optional[str]


class AgentSyncResponse(BaseModel):
    policy: AgentPolicy
    server_time: datetime
