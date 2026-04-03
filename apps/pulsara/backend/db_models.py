from sqlalchemy import Column, String, DateTime, JSON, Integer
from sqlalchemy.sql import func
from database import Base


class Post(Base):
    __tablename__ = "threads_posts"

    id = Column(String, primary_key=True)
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, nullable=False)
    post_type = Column(String, nullable=False, default="text")
    # S3 URLs of uploaded images
    images = Column(JSON, nullable=True)
    engagement = Column(JSON, nullable=False, default=lambda: {
        "likes": 0, "replies": 0, "reposts": 0, "views": 0, "shares": 0
    })
