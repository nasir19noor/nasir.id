from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional

from database import get_db
from models import User, UserAnalytics, QuestionBank
from auth import decode_token
from services.image_service import delete_from_s3

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


class UserAnalyticsView(BaseModel):
    id: int
    user_id: Optional[int]
    ip_address: Optional[str]
    user_agent: Optional[str]
    os: Optional[str]
    device: Optional[str]
    browser: Optional[str]
    location: Optional[str]
    country: Optional[str]
    city: Optional[str]
    latitude: Optional[str]
    longitude: Optional[str]
    referrer: Optional[str]
    source: Optional[str]
    endpoint: Optional[str]
    method: Optional[str]
    status_code: Optional[int]
    response_time_ms: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class UserAnalyticsSummary(BaseModel):
    total_requests: int
    unique_ips: int
    unique_users: int
    top_endpoints: list
    top_devices: list
    top_os: list
    top_browsers: list
    top_sources: list
    top_countries: list
    top_cities: list
    avg_response_time: float
    status_codes: dict


class QuestionBankView(BaseModel):
    id: int
    topic: str
    difficulty: str
    question_text: str
    choices: list
    correct_answer: str
    explanation: Optional[str]
    image_url: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


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


# ─── Analytics Endpoints ───────────────────────────────────────────

@router.get("/analytics/summary", response_model=UserAnalyticsSummary)
def get_analytics_summary(admin: User = Depends(require_admin),
                          db: Session = Depends(get_db)):
    """Get summary of user analytics."""
    analytics = db.query(UserAnalytics).all()
    
    if not analytics:
        return UserAnalyticsSummary(
            total_requests=0,
            unique_ips=0,
            unique_users=0,
            top_endpoints=[],
            top_devices=[],
            top_os=[],
            top_browsers=[],
            top_sources=[],
            top_countries=[],
            top_cities=[],
            avg_response_time=0,
            status_codes={}
        )
    
    # Top endpoints
    top_endpoints = db.query(
        UserAnalytics.endpoint,
        func.count(UserAnalytics.id).label('count')
    ).filter(UserAnalytics.endpoint.isnot(None)).group_by(
        UserAnalytics.endpoint
    ).order_by(desc(func.count(UserAnalytics.id))).limit(10).all()
    
    # Top devices
    top_devices = db.query(
        UserAnalytics.device,
        func.count(UserAnalytics.id).label('count')
    ).filter(UserAnalytics.device.isnot(None)).group_by(
        UserAnalytics.device
    ).order_by(desc(func.count(UserAnalytics.id))).limit(10).all()
    
    # Top OS
    top_os = db.query(
        UserAnalytics.os,
        func.count(UserAnalytics.id).label('count')
    ).filter(UserAnalytics.os.isnot(None)).group_by(
        UserAnalytics.os
    ).order_by(desc(func.count(UserAnalytics.id))).limit(10).all()
    
    # Top browsers
    top_browsers = db.query(
        UserAnalytics.browser,
        func.count(UserAnalytics.id).label('count')
    ).filter(UserAnalytics.browser.isnot(None)).group_by(
        UserAnalytics.browser
    ).order_by(desc(func.count(UserAnalytics.id))).limit(10).all()
    
    # Top sources
    top_sources = db.query(
        UserAnalytics.source,
        func.count(UserAnalytics.id).label('count')
    ).filter(UserAnalytics.source.isnot(None)).group_by(
        UserAnalytics.source
    ).order_by(desc(func.count(UserAnalytics.id))).limit(10).all()
    
    # Status codes
    status_codes_data = db.query(
        UserAnalytics.status_code,
        func.count(UserAnalytics.id).label('count')
    ).filter(UserAnalytics.status_code.isnot(None)).group_by(
        UserAnalytics.status_code
    ).all()
    
    status_codes = {str(code): count for code, count in status_codes_data}
    
    # Average response time
    avg_response = db.query(
        func.avg(UserAnalytics.response_time_ms)
    ).filter(UserAnalytics.response_time_ms.isnot(None)).scalar()
    
    avg_response_time = float(avg_response) if avg_response else 0
    
    # Top countries
    top_countries = db.query(
        UserAnalytics.country,
        func.count(UserAnalytics.id).label('count')
    ).filter(UserAnalytics.country.isnot(None)).group_by(
        UserAnalytics.country
    ).order_by(desc(func.count(UserAnalytics.id))).limit(10).all()
    
    # Top cities
    top_cities = db.query(
        UserAnalytics.city,
        func.count(UserAnalytics.id).label('count')
    ).filter(UserAnalytics.city.isnot(None)).group_by(
        UserAnalytics.city
    ).order_by(desc(func.count(UserAnalytics.id))).limit(10).all()
    
    return UserAnalyticsSummary(
        total_requests=len(analytics),
        unique_ips=len(set(a.ip_address for a in analytics if a.ip_address)),
        unique_users=len(set(a.user_id for a in analytics if a.user_id)),
        top_endpoints=[{"name": ep, "count": cnt} for ep, cnt in top_endpoints],
        top_devices=[{"name": dev, "count": cnt} for dev, cnt in top_devices],
        top_os=[{"name": os_name, "count": cnt} for os_name, cnt in top_os],
        top_browsers=[{"name": br, "count": cnt} for br, cnt in top_browsers],
        top_sources=[{"name": src, "count": cnt} for src, cnt in top_sources],
        top_countries=[{"name": cnt, "count": c} for cnt, c in top_countries],
        top_cities=[{"name": city, "count": c} for city, c in top_cities],
        avg_response_time=avg_response_time,
        status_codes=status_codes
    )


@router.get("/analytics", response_model=list[UserAnalyticsView])
def get_analytics(admin: User = Depends(require_admin),
                  db: Session = Depends(get_db),
                  skip: int = Query(0, ge=0),
                  limit: int = Query(100, ge=1, le=1000),
                  user_id: Optional[int] = None,
                  ip_address: Optional[str] = None):
    """Get user analytics with optional filtering."""
    query = db.query(UserAnalytics)
    
    if user_id:
        query = query.filter(UserAnalytics.user_id == user_id)
    if ip_address:
        query = query.filter(UserAnalytics.ip_address == ip_address)
    
    return query.order_by(desc(UserAnalytics.created_at)).offset(skip).limit(limit).all()


@router.get("/analytics/user/{user_id}", response_model=list[UserAnalyticsView])
def get_user_analytics(user_id: int,
                       admin: User = Depends(require_admin),
                       db: Session = Depends(get_db)):
    """Get analytics for a specific user."""
    return db.query(UserAnalytics).filter(
        UserAnalytics.user_id == user_id
    ).order_by(desc(UserAnalytics.created_at)).limit(100).all()


# ─── Question Bank Endpoints ────────────────────────────────────────

@router.get("/questions", response_model=list[QuestionBankView])
def list_questions(admin: User = Depends(require_admin),
                   db: Session = Depends(get_db)):
    """Get all questions in the question bank, ordered by topic and creation date."""
    return db.query(QuestionBank).order_by(
        QuestionBank.topic,
        desc(QuestionBank.created_at)
    ).all()


@router.delete("/questions/{question_id}", status_code=204)
def delete_question(question_id: int,
                   admin: User = Depends(require_admin),
                   db: Session = Depends(get_db)):
    """Delete a question from the question bank. Also deletes the associated image from S3."""
    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Delete image from S3 if it exists
    if question.image_url:
        delete_from_s3(question.image_url)
    
    db.delete(question)
    db.commit()
