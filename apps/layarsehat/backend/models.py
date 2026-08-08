from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, Text,
    ForeignKey, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Parent(Base):
    __tablename__ = "parents"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String, unique=True, index=True, nullable=False)
    full_name       = Column(String, nullable=True)
    phone_number    = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    children = relationship("Child", back_populates="parent", cascade="all, delete-orphan")


class Child(Base):
    __tablename__ = "children"

    id         = Column(Integer, primary_key=True, index=True)
    parent_id  = Column(Integer, ForeignKey("parents.id"), nullable=False, index=True)
    name       = Column(String, nullable=False)
    birth_year = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    parent  = relationship("Parent", back_populates="children")
    devices = relationship("Device", back_populates="child", cascade="all, delete-orphan")


class PairingCode(Base):
    __tablename__ = "pairing_codes"

    id         = Column(Integer, primary_key=True)
    child_id   = Column(Integer, ForeignKey("children.id"), nullable=False, index=True)
    code       = Column(String(6), nullable=False, index=True)
    used       = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Device(Base):
    __tablename__ = "devices"

    id              = Column(Integer, primary_key=True, index=True)
    child_id        = Column(Integer, ForeignKey("children.id"), nullable=False, index=True)
    device_name     = Column(String, nullable=False)
    brand           = Column(String, nullable=True)
    model           = Column(String, nullable=True)
    android_version = Column(String, nullable=True)
    app_version     = Column(String, nullable=True)
    device_token    = Column(String, unique=True, index=True, nullable=False)
    # 'allow'      : semua aplikasi boleh kecuali yang diblokir
    # 'block_new'  : aplikasi baru otomatis diblokir sampai disetujui orang tua
    default_policy      = Column(String, default="allow")
    daily_limit_minutes = Column(Integer, nullable=True)   # None = tanpa batas
    bedtime_start       = Column(String, nullable=True)    # "21:00"
    bedtime_end         = Column(String, nullable=True)    # "06:00"
    is_active           = Column(Boolean, default=True)
    last_seen           = Column(DateTime(timezone=True), nullable=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())

    child          = relationship("Child", back_populates="devices")
    installed_apps = relationship("InstalledApp", back_populates="device", cascade="all, delete-orphan")
    policies       = relationship("AppPolicy", back_populates="device", cascade="all, delete-orphan")
    usages         = relationship("AppUsage", back_populates="device", cascade="all, delete-orphan")


class InstalledApp(Base):
    __tablename__ = "installed_apps"
    __table_args__ = (UniqueConstraint("device_id", "package_name", name="uq_device_package"),)

    id           = Column(Integer, primary_key=True)
    device_id    = Column(Integer, ForeignKey("devices.id"), nullable=False, index=True)
    package_name = Column(String, nullable=False, index=True)
    app_name     = Column(String, nullable=True)
    version_name = Column(String, nullable=True)
    is_system    = Column(Boolean, default=False)
    is_installed = Column(Boolean, default=True)   # False = sudah di-uninstall
    first_seen   = Column(DateTime(timezone=True), server_default=func.now())
    last_seen    = Column(DateTime(timezone=True), server_default=func.now())

    device = relationship("Device", back_populates="installed_apps")


class AppPolicy(Base):
    __tablename__ = "app_policies"
    __table_args__ = (UniqueConstraint("device_id", "package_name", name="uq_policy_device_package"),)

    id           = Column(Integer, primary_key=True)
    device_id    = Column(Integer, ForeignKey("devices.id"), nullable=False, index=True)
    package_name = Column(String, nullable=False, index=True)
    status       = Column(String, nullable=False)  # 'allowed' | 'blocked'
    updated_at   = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    device = relationship("Device", back_populates="policies")


class AppUsage(Base):
    __tablename__ = "app_usages"
    __table_args__ = (UniqueConstraint("device_id", "package_name", "usage_date", name="uq_usage_device_package_date"),)

    id           = Column(Integer, primary_key=True)
    device_id    = Column(Integer, ForeignKey("devices.id"), nullable=False, index=True)
    package_name = Column(String, nullable=False)
    app_name     = Column(String, nullable=True)
    usage_date   = Column(Date, nullable=False, index=True)
    seconds      = Column(Integer, default=0)
    updated_at   = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    device = relationship("Device", back_populates="usages")
