from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

class PostStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    FAILED = "failed"

class PostType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"

class ContentTone(str, Enum):
    CASUAL = "casual"
    PROFESSIONAL = "professional"
    HUMOROUS = "humorous"
    INSPIRATIONAL = "inspirational"
    EDUCATIONAL = "educational"

class EngagementMetrics(BaseModel):
    likes: int = 0
    replies: int = 0
    reposts: int = 0
    views: int = 0
    shares: int = 0

class PostCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)
    scheduledAt: Optional[datetime] = None
    images: Optional[List[str]] = None
    postType: PostType = PostType.TEXT

class PostUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=500)
    scheduledAt: Optional[datetime] = None
    status: Optional[PostStatus] = None

class PostResponse(BaseModel):
    id: str
    content: str
    createdAt: datetime
    updatedAt: Optional[datetime] = None
    scheduledAt: Optional[datetime] = None
    publishedAt: Optional[datetime] = None
    status: PostStatus
    postType: PostType
    engagement: EngagementMetrics
    images: Optional[List[str]] = None

class AnalyticsOverview(BaseModel):
    totalPosts: int
    totalEngagement: int
    averageEngagement: float
    topPerformingPost: Optional[PostResponse] = None
    engagementGrowth: float = 0.0
    postsThisWeek: int = 0
    postsThisMonth: int = 0

class AnalyticsTimeframe(str, Enum):
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"

class EngagementAnalytics(BaseModel):
    timeframe: AnalyticsTimeframe
    data: List[Dict[str, any]]
    totalEngagement: int
    averageEngagement: float
    bestPerformingDay: Optional[str] = None
    bestPerformingTime: Optional[str] = None

# AI Content Generation Models
class ContentGenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=200)
    tone: ContentTone = ContentTone.CASUAL
    maxLength: int = Field(default=500, ge=50, le=500)
    targetAudience: Optional[str] = "general"

class ContentOptimizationRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)
    targetAudience: Optional[str] = "general"

class HashtagGenerationRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)
    maxHashtags: int = Field(default=5, ge=1, le=10)

class PostingTimeRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)
    targetAudience: Optional[str] = "general"

class SentimentAnalysisRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)