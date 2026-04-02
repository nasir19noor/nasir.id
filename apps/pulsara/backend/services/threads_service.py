"""
Threads API Service
This service will handle integration with Threads API when it becomes available.
For now, it provides mock functionality for development.
"""

import asyncio
import random
import os
import logging
import requests
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from models import PostResponse, EngagementMetrics, PostStatus, PostType

logger = logging.getLogger(__name__)

THREADS_API_BASE = "https://graph.threads.net/v1.0"

class ThreadsService:
    def __init__(self):
        self.client_id = None
        self.client_secret = None
        self.access_token = os.getenv('THREADS_ACCESS_TOKEN')
    
    def get_user_posts_for_analysis(self, limit: int = 25) -> List[Dict]:
        """Fetch user's real Threads posts for personality analysis"""
        if not self.access_token:
            logger.warning("THREADS_ACCESS_TOKEN not set — cannot fetch real posts")
            return []

        try:
            response = requests.get(
                f"{THREADS_API_BASE}/me/threads",
                params={
                    "fields": "id,text,timestamp,like_count,replies_count,reposts_count",
                    "limit": limit,
                    "access_token": self.access_token,
                },
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()
            # Filter out posts with no text (media-only posts)
            return [p for p in data.get("data", []) if p.get("text")]
        except Exception as e:
            logger.error(f"Failed to fetch Threads posts: {e}")
            return []

    async def authenticate(self, client_id: str, client_secret: str) -> bool:
        """Authenticate with Threads API"""
        # Mock authentication for now
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = "mock_access_token"
        return True
    
    async def publish_post(self, content: str, images: Optional[List[str]] = None) -> Dict:
        """Publish a post to Threads"""
        # Mock API call - replace with actual Threads API when available
        await asyncio.sleep(0.5)  # Simulate API delay
        
        # Simulate success/failure
        if random.random() > 0.1:  # 90% success rate
            return {
                "id": f"threads_{random.randint(1000000, 9999999)}",
                "status": "published",
                "published_at": datetime.now().isoformat(),
                "permalink": f"https://threads.net/@username/post/{random.randint(1000000, 9999999)}"
            }
        else:
            raise Exception("Failed to publish post to Threads")
    
    async def schedule_post(self, content: str, scheduled_time: datetime, images: Optional[List[str]] = None) -> Dict:
        """Schedule a post for later publication"""
        # Mock scheduling - in production, this would use a job queue
        await asyncio.sleep(0.3)
        
        return {
            "id": f"scheduled_{random.randint(1000000, 9999999)}",
            "status": "scheduled",
            "scheduled_for": scheduled_time.isoformat(),
            "content": content
        }
    
    async def get_post_analytics(self, post_id: str) -> EngagementMetrics:
        """Get analytics for a specific post"""
        # Mock analytics data
        await asyncio.sleep(0.2)
        
        return EngagementMetrics(
            likes=random.randint(0, 1000),
            replies=random.randint(0, 100),
            reposts=random.randint(0, 50),
            views=random.randint(100, 10000),
            shares=random.randint(0, 25)
        )
    
    async def get_account_analytics(self, timeframe: str = "week") -> Dict:
        """Get account-level analytics"""
        await asyncio.sleep(0.5)
        
        # Generate mock data based on timeframe
        days = {"week": 7, "month": 30, "quarter": 90, "year": 365}[timeframe]
        
        data = []
        base_date = datetime.now() - timedelta(days=days)
        
        for i in range(days):
            date = base_date + timedelta(days=i)
            data.append({
                "date": date.strftime("%Y-%m-%d"),
                "likes": random.randint(10, 200),
                "replies": random.randint(5, 50),
                "reposts": random.randint(2, 30),
                "views": random.randint(100, 2000)
            })
        
        return {
            "timeframe": timeframe,
            "data": data,
            "total_engagement": sum(d["likes"] + d["replies"] + d["reposts"] for d in data),
            "average_engagement": sum(d["likes"] + d["replies"] + d["reposts"] for d in data) / len(data),
            "best_performing_day": max(data, key=lambda x: x["likes"] + x["replies"] + x["reposts"])["date"]
        }
    
    async def delete_post(self, post_id: str) -> bool:
        """Delete a post from Threads"""
        await asyncio.sleep(0.3)
        
        # Mock deletion - 95% success rate
        return random.random() > 0.05
    
    async def get_user_profile(self) -> Dict:
        """Get user profile information"""
        await asyncio.sleep(0.4)
        
        return {
            "id": "mock_user_id",
            "username": "mock_username",
            "display_name": "Mock User",
            "bio": "This is a mock user profile for development",
            "followers_count": random.randint(100, 10000),
            "following_count": random.randint(50, 1000),
            "posts_count": random.randint(10, 500),
            "profile_picture_url": "https://via.placeholder.com/150",
            "verified": False
        }

# Singleton instance
threads_service = ThreadsService()