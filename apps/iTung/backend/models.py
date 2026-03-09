from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String, unique=True, index=True, nullable=False)
    email           = Column(String, unique=True, index=True, nullable=False)
    full_name       = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)   # nullable for Google-only accounts
    is_active       = Column(Boolean, default=True)
    is_admin        = Column(Boolean, default=False)
    ai_access       = Column(Boolean, default=False)
    google_id       = Column(String, nullable=True, unique=True, index=True)
    phone_number    = Column(String, nullable=True, unique=True, index=True)
    claude_api_key  = Column(Text, nullable=True)    # Fernet-encrypted
    gemini_api_key  = Column(Text, nullable=True)    # Fernet-encrypted
    birth_date      = Column(Date, nullable=True)
    avatar_url      = Column(String, nullable=True)
    cartoon_url     = Column(String, nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())
    sessions        = relationship('QuizSession', back_populates="user")


class OtpCode(Base):
    __tablename__ = "otp_codes"

    id         = Column(Integer, primary_key=True)
    phone      = Column(String, nullable=False, index=True)
    code       = Column(String(6), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id              = Column(Integer, primary_key=True)
    user_id         = Column(Integer, ForeignKey('users.id'))
    topic           = Column(String)
    total_questions = Column(Integer)
    score           = Column(Integer, default=0)
    completed       = Column(Boolean, default=False)
    use_ai          = Column(Boolean, default=True)
    include_images  = Column(Boolean, default=False)
    client          = Column(String, default="web")
    created_at      = Column(DateTime, default=datetime.utcnow)
    user            = relationship('User', back_populates="sessions")
    questions       = relationship('Question', back_populates="session")


class QuestionBank(Base):
    """Pre-written questions used when use_ai=False."""
    __tablename__ = "question_bank"

    id             = Column(Integer, primary_key=True, index=True)
    topic          = Column(String, nullable=False, index=True)
    difficulty     = Column(String, nullable=False, default="sedang")  # sangat_mudah | mudah | sedang | sulit | sangat_sulit
    question_text  = Column(Text, nullable=False)
    choices        = Column(JSON, nullable=False)   # ["A. ...", "B. ...", "C. ...", "D. ..."]
    correct_answer = Column(String, nullable=False)  # "A" | "B" | "C" | "D"
    explanation    = Column(Text)
    image_url      = Column(String, nullable=True)
    is_active      = Column(Boolean, default=True)
    created_at     = Column(DateTime, default=datetime.utcnow)


class Question(Base):
    """Questions served to users within a session (either AI-generated or from QuestionBank)."""
    __tablename__ = "questions"

    id               = Column(Integer, primary_key=True, index=True)
    session_id       = Column(Integer, ForeignKey('quiz_sessions.id'))
    user_id          = Column(Integer, ForeignKey('users.id'))
    bank_question_id = Column(Integer, ForeignKey('question_bank.id'), nullable=True)
    topic            = Column(String, nullable=False)
    difficulty       = Column(String, default="sedang")  # sangat_mudah | mudah | sedang | sulit | sangat_sulit
    question_text    = Column(Text, nullable=False)
    choices          = Column(JSON, nullable=False)
    correct_answer   = Column(String, nullable=False)
    explanation      = Column(Text)
    image_url        = Column(String, nullable=True)
    source           = Column(String, default="ai")   # "ai" | "bank"
    order_number     = Column(Integer)
    created_at       = Column(DateTime, default=datetime.utcnow)
    session          = relationship('QuizSession', back_populates="questions")
    answer           = relationship('UserAnswer', back_populates="question", uselist=False)
    bank_question    = relationship('QuestionBank', foreign_keys=[bank_question_id])


class UserAnswer(Base):
    __tablename__ = "user_answers"

    id           = Column(Integer, primary_key=True, index=True)
    question_id  = Column(Integer, ForeignKey('questions.id'))
    session_id   = Column(Integer, ForeignKey('quiz_sessions.id'))
    user_id      = Column(Integer, ForeignKey('users.id'))
    topic        = Column(String)
    difficulty   = Column(String)
    user_answer  = Column(String, nullable=False)
    is_correct   = Column(Boolean, nullable=False)
    time_seconds = Column(Integer)
    created_at   = Column(DateTime, default=datetime.utcnow)
    question     = relationship('Question', back_populates="answer")


class UserAnalytics(Base):
    __tablename__ = "user_analytics"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)
    ip_address      = Column(String, nullable=True, index=True)
    user_agent      = Column(String, nullable=True)
    os              = Column(String, nullable=True)
    device          = Column(String, nullable=True)
    browser         = Column(String, nullable=True)
    location        = Column(String, nullable=True)
    country         = Column(String, nullable=True)
    city            = Column(String, nullable=True)
    latitude        = Column(String, nullable=True)
    longitude       = Column(String, nullable=True)
    referrer        = Column(String, nullable=True, index=True)
    source          = Column(String, nullable=True, index=True)
    endpoint        = Column(String, nullable=True)
    method          = Column(String, nullable=True)
    status_code     = Column(Integer, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now(), index=True)
