from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse, RedirectResponse
from typing import Optional, List
from datetime import datetime, timedelta
import uvicorn
import uuid
import os
import boto3
import requests as http_requests

from models import (
    PostCreate, PostUpdate, PostResponse, AnalyticsOverview,
    EngagementMetrics, PostStatus, PostType, AnalyticsTimeframe,
    ContentGenerationRequest, ContentOptimizationRequest,
    HashtagGenerationRequest, PostingTimeRequest, SentimentAnalysisRequest,
    PersonalizedContentRequest, TrendingTopicsResponse
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

@app.get("/api/health/bedrock")
async def bedrock_health_check():
    """Check AWS Bedrock configuration status"""
    aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
    aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
    bedrock_region = os.getenv('BEDROCK_REGION', 'us-east-1')
    bedrock_model = os.getenv('BEDROCK_MODEL_ID', 'anthropic.claude-3-5-sonnet-20241022-v2:0')
    inference_profile_id = os.getenv('BEDROCK_INFERENCE_PROFILE_ID')
    inference_profile_arn = os.getenv('BEDROCK_INFERENCE_PROFILE_ARN')
    
    status = {
        "bedrock_configured": bool(aws_access_key and aws_secret_key),
        "aws_access_key_set": bool(aws_access_key),
        "aws_secret_key_set": bool(aws_secret_key),
        "bedrock_region": bedrock_region,
        "bedrock_model": bedrock_model,
        "inference_profile_id": inference_profile_id,
        "inference_profile_arn": inference_profile_arn,
        "client_initialized": bedrock_service.bedrock_client is not None,
        "use_inference_profile": bedrock_service.use_inference_profile if bedrock_service.bedrock_client else False
    }
    
    if not status["bedrock_configured"]:
        status["message"] = "AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables."
    else:
        status["message"] = "AWS Bedrock is properly configured."
    
    return status

@app.get("/api/bedrock/list-inference-profiles")
async def list_inference_profiles():
    """List available inference profiles"""
    try:
        if not bedrock_service.bedrock_client:
            raise HTTPException(status_code=503, detail="Bedrock client not configured")
        
        # Try to list inference profiles using boto3
        bedrock_client = boto3.client(
            'bedrock',
            region_name=bedrock_service.region,
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
        )
        
        response = bedrock_client.list_inference_profiles()
        return {
            "inference_profiles": response.get('inferenceProfileSummaries', []),
            "region": bedrock_service.region
        }
    except Exception as e:
        return {
            "error": f"Failed to list inference profiles: {str(e)}",
            "suggestion": "Check AWS Bedrock console manually for available inference profiles"
        }

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
    
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    
    return result

@app.post("/api/ai/optimize-content")
async def optimize_content(request: ContentOptimizationRequest):
    """Optimize existing content for better engagement"""
    result = await bedrock_service.optimize_content(
        content=request.content,
        target_audience=request.targetAudience
    )
    
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    
    return result

@app.post("/api/ai/generate-hashtags")
async def generate_hashtags(request: HashtagGenerationRequest):
    """Generate relevant hashtags for content"""
    result = await bedrock_service.generate_hashtags(
        content=request.content,
        max_hashtags=request.maxHashtags
    )
    
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    
    return result

@app.post("/api/ai/suggest-posting-time")
async def suggest_posting_time(request: PostingTimeRequest):
    """Suggest optimal posting times"""
    result = await bedrock_service.suggest_posting_time(
        content=request.content,
        target_audience=request.targetAudience
    )
    
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    
    return result

@app.post("/api/ai/analyze-sentiment")
async def analyze_sentiment(request: SentimentAnalysisRequest):
    """Analyze sentiment and tone of content"""
    result = await bedrock_service.analyze_sentiment(
        content=request.content
    )
    
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    
    return result

THREADS_APP_ID = os.getenv("THREADS_CLIENT_ID", "905950879151394")
THREADS_APP_SECRET = os.getenv("THREADS_CLIENT_SECRET", "")
THREADS_REDIRECT_URI = os.getenv("THREADS_REDIRECT_URI", "https://api.pulsara.nasir.id/api/auth/threads/callback")


@app.get("/api/auth/threads")
async def threads_auth_start():
    """Redirect to Threads OAuth authorization page"""
    auth_url = (
        f"https://threads.net/oauth/authorize"
        f"?client_id={THREADS_APP_ID}"
        f"&redirect_uri={THREADS_REDIRECT_URI}"
        f"&scope=threads_basic,threads_content_publish"
        f"&response_type=code"
    )
    return RedirectResponse(url=auth_url)


@app.get("/api/auth/threads/callback")
async def threads_auth_callback(code: str = None, error: str = None, error_description: str = None):
    """Handle Threads OAuth callback and exchange code for access token"""
    if error:
        return HTMLResponse(content=f"""
        <html><body style="font-family:sans-serif;padding:2rem;max-width:600px;margin:0 auto">
            <h2 style="color:#dc2626">OAuth Error</h2>
            <p><strong>{error}</strong>: {error_description or ''}</p>
        </body></html>
        """)

    if not code:
        raise HTTPException(status_code=400, detail="No authorization code received")

    # Exchange code for short-lived token
    try:
        token_res = http_requests.post(
            "https://graph.threads.net/oauth/access_token",
            data={
                "client_id": THREADS_APP_ID,
                "client_secret": THREADS_APP_SECRET,
                "grant_type": "authorization_code",
                "redirect_uri": THREADS_REDIRECT_URI,
                "code": code,
            },
            timeout=10,
        )
        token_data = token_res.json()
        if "error" in token_data:
            raise ValueError(token_data["error"].get("message", str(token_data["error"])))

        short_token = token_data["access_token"]

        # Exchange for long-lived token (60 days)
        long_res = http_requests.get(
            "https://graph.threads.net/access_token",
            params={
                "grant_type": "th_exchange_token",
                "client_secret": THREADS_APP_SECRET,
                "access_token": short_token,
            },
            timeout=10,
        )
        long_data = long_res.json()
        if "error" in long_data:
            raise ValueError(long_data["error"].get("message", str(long_data["error"])))

        long_token = long_data.get("access_token", short_token)
        expires_in = long_data.get("expires_in", 0)
        days = round(expires_in / 86400)

        return HTMLResponse(content=f"""
        <html><body style="font-family:sans-serif;padding:2rem;max-width:700px;margin:0 auto">
            <h2 style="color:#16a34a">✓ Threads Connected Successfully</h2>
            <p>Copy this token into your backend <code>.env</code> file:</p>
            <pre style="background:#f3f4f6;padding:1rem;border-radius:8px;word-break:break-all;white-space:pre-wrap;border:1px solid #e5e7eb"><code>THREADS_ACCESS_TOKEN={long_token}</code></pre>
            <p style="color:#6b7280;font-size:0.875rem">This token is valid for <strong>{days} days</strong>. Restart your backend after updating <code>.env</code>.</p>
            <script>
              document.querySelector('pre').addEventListener('click', function() {{
                navigator.clipboard.writeText('{long_token}');
                this.style.background='#dcfce7';
                setTimeout(()=>this.style.background='#f3f4f6', 1000);
              }});
            </script>
            <p style="color:#6b7280;font-size:0.875rem">💡 Click the token box to copy.</p>
        </body></html>
        """)

    except Exception as e:
        return HTMLResponse(content=f"""
        <html><body style="font-family:sans-serif;padding:2rem;max-width:600px;margin:0 auto">
            <h2 style="color:#dc2626">Token Exchange Failed</h2>
            <p>{str(e)}</p>
        </body></html>
        """)


@app.get("/api/threads/my-posts")
async def get_my_threads_posts(limit: int = 25):
    """Fetch the authenticated user's Threads posts for personality analysis"""
    posts = threads_service.get_user_posts_for_analysis(limit=limit)
    if not posts and not os.getenv('THREADS_ACCESS_TOKEN'):
        return {
            "posts": [],
            "connected": False,
            "message": "Set THREADS_ACCESS_TOKEN in your environment to fetch real posts.",
        }
    return {"posts": posts, "connected": True, "count": len(posts)}


@app.post("/api/ai/analyze-personality")
async def analyze_personality():
    """Fetch user's Threads posts and analyze their writing personality"""
    try:
        posts = threads_service.get_user_posts_for_analysis(limit=25)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not posts:
        raise HTTPException(
            status_code=400,
            detail="No Threads posts found. Make sure THREADS_ACCESS_TOKEN is a valid user access token and your account has posts.",
        )
    result = await bedrock_service.analyze_personality(posts)
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result


@app.get("/api/ai/trending-topics")
async def get_trending_topics(category: Optional[str] = None, region: Optional[str] = None):
    """Get AI-generated trending topics for Threads content, optionally filtered by category and region"""
    result = await bedrock_service.get_trending_topics(category=category, region=region)
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result


@app.post("/api/ai/generate-personalized")
async def generate_personalized_content(request: PersonalizedContentRequest):
    """Generate content matching the user's personality and trending topics"""
    result = await bedrock_service.generate_personalized_content(
        prompt=request.prompt,
        personality_summary=request.personality_summary,
        trending_topics=request.trending_topics,
        tone=request.tone.value,
        max_length=request.maxLength,
    )
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9001)


    