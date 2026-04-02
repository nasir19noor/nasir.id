from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import datetime, timedelta
import uvicorn
import uuid

from models import (
    PostCreate, PostUpdate, PostResponse, AnalyticsOverview, 
    EngagementMetrics, PostStatus, PostType, AnalyticsTimeframe,
    ContentGenerationRequest, ContentOptimizationRequest, 
    HashtagGenerationRequest, PostingTimeRequest, SentimentAnalysisRequest
)
from services.threads_service import threads_service
from services.bedrock_service import bedrock_service

app = FastAPI(
    title="Pulsara API",
    description="Social Media Management API for Threads",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for demo (replace with database in production)
posts_db = []

async def simulate_engagement_growth(post_id: str):
    """Background task to simulate engagement growth over time"""
    import asyncio
    import random
    
    # Find the post
    post = next((p for p in posts_db if p["id"] == post_id), None)
    if not post:
        return
    
    # Simulate engagement growth over time
    for _ in range(5):  # 5 updates over time
        await asyncio.sleep(10)  # Wait 10 seconds between updates
        
        # Add some random engagement
        post["engagement"]["likes"] += random.randint(0, 5)
        post["engagement"]["replies"] += random.randint(0, 2)
        post["engagement"]["reposts"] += random.randint(0, 1)
        post["engagement"]["views"] += random.randint(5, 50)

@app.get("/")
async def root():
    return {"message": "Pulsara API - Social Media Management for Threads"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

@app.post("/api/posts", response_model=PostResponse)
async def create_post(post: PostCreate, background_tasks: BackgroundTasks):
    """Create a new Threads post"""
    try:
        post_id = str(uuid.uuid4())
        now = datetime.now()
        
        # Determine if this should be published immediately or scheduled
        if post.scheduledAt and post.scheduledAt > now:
            status = PostStatus.SCHEDULED
            published_at = None
        else:
            status = PostStatus.PUBLISHED
            published_at = now
            
            # If publishing immediately, simulate API call to Threads
            try:
                threads_response = await threads_service.publish_post(
                    content=post.content,
                    images=post.images
                )
                # In a real implementation, you'd store the Threads post ID
            except Exception as e:
                status = PostStatus.FAILED
        
        # Create post object
        new_post = {
            "id": post_id,
            "content": post.content,
            "createdAt": now,
            "updatedAt": now,
            "scheduledAt": post.scheduledAt,
            "publishedAt": published_at,
            "status": status,
            "postType": post.postType,
            "engagement": {
                "likes": 0,
                "replies": 0,
                "reposts": 0,
                "views": 0,
                "shares": 0
            },
            "images": post.images
        }
        
        posts_db.append(new_post)
        
        # Start background task to simulate engagement growth
        if status == PostStatus.PUBLISHED:
            background_tasks.add_task(simulate_engagement_growth, post_id)
        
        return PostResponse(**new_post)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create post: {str(e)}")

@app.get("/api/posts", response_model=List[PostResponse])
async def get_posts(status: Optional[PostStatus] = None, limit: int = 50):
    """Get posts with optional filtering"""
    filtered_posts = posts_db
    
    if status:
        filtered_posts = [p for p in posts_db if p["status"] == status]
    
    # Sort by creation date (newest first)
    filtered_posts.sort(key=lambda x: x["createdAt"], reverse=True)
    
    return [PostResponse(**post) for post in filtered_posts[:limit]]

@app.get("/api/posts/{post_id}", response_model=PostResponse)
async def get_post(post_id: str):
    """Get a specific post by ID"""
    post = next((p for p in posts_db if p["id"] == post_id), None)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return PostResponse(**post)

@app.put("/api/posts/{post_id}", response_model=PostResponse)
async def update_post(post_id: str, post_update: PostUpdate):
    """Update a post"""
    post = next((p for p in posts_db if p["id"] == post_id), None)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Update fields if provided
    if post_update.content is not None:
        post["content"] = post_update.content
    if post_update.scheduledAt is not None:
        post["scheduledAt"] = post_update.scheduledAt
    if post_update.status is not None:
        post["status"] = post_update.status
    
    post["updatedAt"] = datetime.now()
    
    return PostResponse(**post)

@app.delete("/api/posts/{post_id}")
async def delete_post(post_id: str):
    """Delete a post"""
    global posts_db
    post = next((p for p in posts_db if p["id"] == post_id), None)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # If post is published, try to delete from Threads
    if post["status"] == PostStatus.PUBLISHED:
        try:
            await threads_service.delete_post(post_id)
        except Exception as e:
            # Log error but continue with local deletion
            print(f"Failed to delete post from Threads: {e}")
    
    posts_db = [p for p in posts_db if p["id"] != post_id]
    return {"message": "Post deleted successfully"}

@app.get("/api/analytics/overview", response_model=AnalyticsOverview)
async def get_analytics_overview():
    """Get analytics overview"""
    if not posts_db:
        return AnalyticsOverview(
            totalPosts=0,
            totalEngagement=0,
            averageEngagement=0.0,
            topPerformingPost=None,
            engagementGrowth=0.0,
            postsThisWeek=0,
            postsThisMonth=0
        )
    
    total_posts = len(posts_db)
    total_engagement = sum(
        post["engagement"]["likes"] + 
        post["engagement"]["replies"] + 
        post["engagement"]["reposts"]
        for post in posts_db
    )
    
    # Calculate posts this week and month
    now = datetime.now()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    posts_this_week = len([
        p for p in posts_db 
        if p["createdAt"] >= week_ago
    ])
    
    posts_this_month = len([
        p for p in posts_db 
        if p["createdAt"] >= month_ago
    ])
    
    # Find top performing post
    top_post = max(
        posts_db, 
        key=lambda p: p["engagement"]["likes"] + p["engagement"]["replies"] + p["engagement"]["reposts"]
    )
    
    return AnalyticsOverview(
        totalPosts=total_posts,
        totalEngagement=total_engagement,
        averageEngagement=total_engagement / total_posts if total_posts > 0 else 0,
        topPerformingPost=PostResponse(**top_post),
        engagementGrowth=5.2,  # Mock growth percentage
        postsThisWeek=posts_this_week,
        postsThisMonth=posts_this_month
    )

@app.get("/api/analytics/engagement")
async def get_engagement_analytics(timeframe: AnalyticsTimeframe = AnalyticsTimeframe.WEEK):
    """Get engagement analytics for a specific timeframe"""
    analytics = await threads_service.get_account_analytics(timeframe.value)
    return analytics

@app.get("/api/user/profile")
async def get_user_profile():
    """Get user profile information"""
    profile = await threads_service.get_user_profile()
    return profile

# AI Content Generation Endpoints

@app.post("/api/ai/generate-content")
async def generate_content(request: ContentGenerationRequest):
    """Generate content using AWS Bedrock"""
    result = await bedrock_service.generate_content(
        prompt=request.prompt,
        tone=request.tone.value,
        max_length=request.maxLength
    )
    return result

@app.post("/api/ai/optimize-content")
async def optimize_content(request: ContentOptimizationRequest):
    """Optimize existing content for better engagement"""
    result = await bedrock_service.optimize_content(
        content=request.content,
        target_audience=request.targetAudience
    )
    return result

@app.post("/api/ai/generate-hashtags")
async def generate_hashtags(request: HashtagGenerationRequest):
    """Generate relevant hashtags for content"""
    result = await bedrock_service.generate_hashtags(
        content=request.content,
        max_hashtags=request.maxHashtags
    )
    return result

@app.post("/api/ai/suggest-posting-time")
async def suggest_posting_time(request: PostingTimeRequest):
    """Suggest optimal posting times"""
    result = await bedrock_service.suggest_posting_time(
        content=request.content,
        target_audience=request.targetAudience
    )
    return result

@app.post("/api/ai/analyze-sentiment")
async def analyze_sentiment(request: SentimentAnalysisRequest):
    """Analyze sentiment and tone of content"""
    result = await bedrock_service.analyze_sentiment(
        content=request.content
    )
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9001)


    