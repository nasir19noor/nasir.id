from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse, RedirectResponse
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
import uvicorn
import uuid
import os
import base64
import boto3
import requests as http_requests
from sqlalchemy.orm import Session

from models import (
    PostCreate, PostUpdate, PostResponse, AnalyticsOverview,
    EngagementMetrics, PostStatus, PostType, AnalyticsTimeframe,
    ContentGenerationRequest, ContentOptimizationRequest,
    HashtagGenerationRequest, PostingTimeRequest, SentimentAnalysisRequest,
    PersonalizedContentRequest, TrendingTopicsResponse
)
from database import get_db, init_db
import db_models
from services.threads_service import threads_service
from services.bedrock_service import bedrock_service
from services.s3_service import s3_service
from services.vertex_service import vertex_image_service
from auth import verify_credentials, create_access_token, get_current_user

app = FastAPI(
    title="Pulsara API",
    description="Social Media Management API for Threads",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public paths that don't require authentication
PUBLIC_PATHS = {"/", "/health", "/api/auth/login", "/api/auth/threads", "/api/auth/threads/callback"}


@app.middleware("http")
async def auth_middleware(request, call_next):
    from fastapi.responses import JSONResponse
    path = request.url.path
    if path in PUBLIC_PATHS or not path.startswith("/api/"):
        return await call_next(request)
    # Validate Bearer token for all other /api/* routes
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
    from auth import get_current_user as _verify
    from fastapi.security import HTTPAuthorizationCredentials
    try:
        token = auth_header.split(" ", 1)[1]
        from jose import jwt as _jwt, JWTError
        import os as _os
        payload = _jwt.decode(token, _os.getenv("SECRET_KEY", "changeme"), algorithms=[_os.getenv("ALGORITHM", "HS256")])
        if not payload.get("sub"):
            raise ValueError
    except Exception:
        return JSONResponse(status_code=401, content={"detail": "Invalid or expired token"})
    return await call_next(request)


@app.on_event("startup")
def on_startup():
    init_db()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _db_post_to_dict(post: db_models.Post) -> dict:
    return {
        "id": post.id,
        "content": post.content,
        "createdAt": post.created_at,
        "updatedAt": post.updated_at,
        "scheduledAt": post.scheduled_at,
        "publishedAt": post.published_at,
        "status": post.status,
        "postType": post.post_type,
        "engagement": post.engagement or {"likes": 0, "replies": 0, "reposts": 0, "views": 0, "shares": 0},
        "images": post.images or [],
    }


async def simulate_engagement_growth(post_id: str):
    """Background task to simulate engagement growth"""
    import asyncio
    import random
    from database import SessionLocal

    for _ in range(5):
        await asyncio.sleep(10)
        db = SessionLocal()
        try:
            post = db.query(db_models.Post).filter(db_models.Post.id == post_id).first()
            if not post:
                break
            eng = dict(post.engagement)
            eng["likes"] += random.randint(0, 5)
            eng["replies"] += random.randint(0, 2)
            eng["reposts"] += random.randint(0, 1)
            eng["views"] += random.randint(5, 50)
            post.engagement = eng
            db.commit()
        finally:
            db.close()


# ── Core endpoints ─────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "Pulsara API - Social Media Management for Threads"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}


@app.get("/api/health/bedrock")
async def bedrock_health_check():
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
        "use_inference_profile": bedrock_service.use_inference_profile if bedrock_service.bedrock_client else False,
    }
    status["message"] = (
        "AWS Bedrock is properly configured." if status["bedrock_configured"]
        else "AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY."
    )
    return status


class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/api/auth/login")
async def login(request: LoginRequest):
    """Authenticate and return a JWT token"""
    if not verify_credentials(request.email, request.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token({"sub": request.email})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/api/auth/me")
async def me(current_user: str = Depends(get_current_user)):
    return {"email": current_user}


@app.get("/api/bedrock/list-inference-profiles")
async def list_inference_profiles():
    try:
        if not bedrock_service.bedrock_client:
            raise HTTPException(status_code=503, detail="Bedrock client not configured")
        client = boto3.client(
            'bedrock',
            region_name=bedrock_service.region,
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        )
        response = client.list_inference_profiles()
        return {"inference_profiles": response.get('inferenceProfileSummaries', []), "region": bedrock_service.region}
    except Exception as e:
        return {"error": f"Failed to list inference profiles: {str(e)}"}


# ── Posts ──────────────────────────────────────────────────────────────────────

@app.post("/api/posts", response_model=PostResponse)
async def create_post(post: PostCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Create a new Threads post, persist to DB, upload images to S3"""
    try:
        post_id = str(uuid.uuid4())
        now = datetime.now()

        # Upload images to S3 if provided
        image_urls: List[str] = []
        if post.images:
            image_urls = s3_service.upload_images(post.images)

        # Determine status
        if post.scheduledAt and post.scheduledAt > now:
            status = PostStatus.SCHEDULED
            published_at = None
        else:
            status = PostStatus.PUBLISHED
            published_at = now
            try:
                await threads_service.publish_post(content=post.content, images=image_urls or post.images)
            except Exception:
                status = PostStatus.FAILED

        db_post = db_models.Post(
            id=post_id,
            content=post.content,
            created_at=now,
            updated_at=now,
            scheduled_at=post.scheduledAt,
            published_at=published_at,
            status=status.value,
            post_type=post.postType.value,
            images=image_urls if image_urls else (post.images or []),
            engagement={"likes": 0, "replies": 0, "reposts": 0, "views": 0, "shares": 0},
        )
        db.add(db_post)
        db.commit()
        db.refresh(db_post)

        if status == PostStatus.PUBLISHED:
            background_tasks.add_task(simulate_engagement_growth, post_id)

        return PostResponse(**_db_post_to_dict(db_post))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create post: {str(e)}")


@app.get("/api/posts", response_model=List[PostResponse])
async def get_posts(status: Optional[PostStatus] = None, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(db_models.Post)
    if status:
        query = query.filter(db_models.Post.status == status.value)
    posts = query.order_by(db_models.Post.created_at.desc()).limit(limit).all()
    return [PostResponse(**_db_post_to_dict(p)) for p in posts]


@app.get("/api/posts/{post_id}", response_model=PostResponse)
async def get_post(post_id: str, db: Session = Depends(get_db)):
    post = db.query(db_models.Post).filter(db_models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return PostResponse(**_db_post_to_dict(post))


@app.put("/api/posts/{post_id}", response_model=PostResponse)
async def update_post(post_id: str, post_update: PostUpdate, db: Session = Depends(get_db)):
    post = db.query(db_models.Post).filter(db_models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post_update.content is not None:
        post.content = post_update.content
    if post_update.scheduledAt is not None:
        post.scheduled_at = post_update.scheduledAt
    if post_update.status is not None:
        post.status = post_update.status.value
    post.updated_at = datetime.now()
    db.commit()
    db.refresh(post)
    return PostResponse(**_db_post_to_dict(post))


@app.delete("/api/posts/{post_id}")
async def delete_post(post_id: str, db: Session = Depends(get_db)):
    post = db.query(db_models.Post).filter(db_models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.status == PostStatus.PUBLISHED.value:
        try:
            await threads_service.delete_post(post_id)
        except Exception as e:
            print(f"Failed to delete from Threads: {e}")
    db.delete(post)
    db.commit()
    return {"message": "Post deleted successfully"}


# ── Analytics ──────────────────────────────────────────────────────────────────

@app.get("/api/analytics/overview", response_model=AnalyticsOverview)
async def get_analytics_overview(db: Session = Depends(get_db)):
    posts = db.query(db_models.Post).all()
    if not posts:
        return AnalyticsOverview(
            totalPosts=0, totalEngagement=0, averageEngagement=0.0,
            topPerformingPost=None, engagementGrowth=0.0,
            postsThisWeek=0, postsThisMonth=0,
        )

    total_posts = len(posts)
    total_engagement = sum(
        (p.engagement.get("likes", 0) + p.engagement.get("replies", 0) + p.engagement.get("reposts", 0))
        for p in posts
    )

    now = datetime.now()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    posts_this_week = sum(1 for p in posts if p.created_at and p.created_at.replace(tzinfo=None) >= week_ago)
    posts_this_month = sum(1 for p in posts if p.created_at and p.created_at.replace(tzinfo=None) >= month_ago)

    top_post = max(posts, key=lambda p: (
        p.engagement.get("likes", 0) + p.engagement.get("replies", 0) + p.engagement.get("reposts", 0)
    ))

    return AnalyticsOverview(
        totalPosts=total_posts,
        totalEngagement=total_engagement,
        averageEngagement=total_engagement / total_posts,
        topPerformingPost=PostResponse(**_db_post_to_dict(top_post)),
        engagementGrowth=5.2,
        postsThisWeek=posts_this_week,
        postsThisMonth=posts_this_month,
    )


@app.get("/api/analytics/engagement")
async def get_engagement_analytics(timeframe: AnalyticsTimeframe = AnalyticsTimeframe.WEEK):
    return await threads_service.get_account_analytics(timeframe.value)


@app.get("/api/user/profile")
async def get_user_profile():
    return await threads_service.get_user_profile()


# ── Image Endpoints ────────────────────────────────────────────────────────────

@app.post("/api/media/upload")
async def upload_image(file: UploadFile = File(...)):
    """Upload a local image file to S3, return the public URL"""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        raw = await file.read()
        b64 = base64.b64encode(raw).decode("utf-8")
        data_uri = f"data:{file.content_type};base64,{b64}"

        from datetime import datetime as _dt
        folder = f"uploads/{_dt.now().strftime('%Y%m%d_%H%M%S')}"
        url = s3_service.upload_base64_image(data_uri, folder)
        if not url:
            raise HTTPException(status_code=500, detail="Failed to upload image to S3")

        return {"url": url, "filename": file.filename}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


class ImageGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=500)
    aspect_ratio: str = Field(default="1:1")
    count: int = Field(default=1, ge=1, le=4)
    upload_to_s3: bool = Field(default=True)


@app.post("/api/ai/generate-image")
async def generate_image(request: ImageGenerateRequest):
    """Generate an image using Google Vertex AI Imagen"""
    if not vertex_image_service.enabled:
        raise HTTPException(
            status_code=503,
            detail="AI image generation is not configured. Set VERTEX_PROJECT_ID in environment variables."
        )

    try:
        data_uris = vertex_image_service.generate_image(
            prompt=request.prompt,
            aspect_ratio=request.aspect_ratio,
            count=request.count,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

    urls = []
    if request.upload_to_s3:
        uploaded = s3_service.upload_images(data_uris)
        urls = uploaded if uploaded else data_uris
    else:
        urls = data_uris

    return {
        "images": urls,
        "prompt": request.prompt,
        "count": len(urls),
    }


# ── AI Content Generation ──────────────────────────────────────────────────────

@app.post("/api/ai/generate-content")
async def generate_content(request: ContentGenerationRequest):
    result = await bedrock_service.generate_content(
        prompt=request.prompt, tone=request.tone.value, max_length=request.maxLength
    )
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result


@app.post("/api/ai/optimize-content")
async def optimize_content(request: ContentOptimizationRequest):
    result = await bedrock_service.optimize_content(
        content=request.content, target_audience=request.targetAudience
    )
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result


@app.post("/api/ai/generate-hashtags")
async def generate_hashtags(request: HashtagGenerationRequest):
    result = await bedrock_service.generate_hashtags(
        content=request.content, max_hashtags=request.maxHashtags
    )
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result


@app.post("/api/ai/suggest-posting-time")
async def suggest_posting_time(request: PostingTimeRequest):
    result = await bedrock_service.suggest_posting_time(
        content=request.content, target_audience=request.targetAudience
    )
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result


@app.post("/api/ai/analyze-sentiment")
async def analyze_sentiment(request: SentimentAnalysisRequest):
    result = await bedrock_service.analyze_sentiment(content=request.content)
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result


# ── Threads OAuth ──────────────────────────────────────────────────────────────

THREADS_APP_ID = os.getenv("THREADS_CLIENT_ID", "905950879151394")
THREADS_APP_SECRET = os.getenv("THREADS_CLIENT_SECRET", "")
THREADS_REDIRECT_URI = os.getenv("THREADS_REDIRECT_URI", "https://api.pulsara.nasir.id/api/auth/threads/callback")


@app.get("/api/auth/threads")
async def threads_auth_start():
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
    if error:
        return HTMLResponse(content=f"""
        <html><body style="font-family:sans-serif;padding:2rem;max-width:600px;margin:0 auto">
            <h2 style="color:#dc2626">OAuth Error</h2>
            <p><strong>{error}</strong>: {error_description or ''}</p>
        </body></html>""")

    if not code:
        raise HTTPException(status_code=400, detail="No authorization code received")

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
        long_res = http_requests.get(
            "https://graph.threads.net/access_token",
            params={"grant_type": "th_exchange_token", "client_secret": THREADS_APP_SECRET, "access_token": short_token},
            timeout=10,
        )
        long_data = long_res.json()
        if "error" in long_data:
            raise ValueError(long_data["error"].get("message", str(long_data["error"])))

        long_token = long_data.get("access_token", short_token)
        days = round(long_data.get("expires_in", 0) / 86400)

        return HTMLResponse(content=f"""
        <html><body style="font-family:sans-serif;padding:2rem;max-width:700px;margin:0 auto">
            <h2 style="color:#16a34a">✓ Threads Connected Successfully</h2>
            <p>Copy this token into your backend <code>.env</code> file:</p>
            <pre style="background:#f3f4f6;padding:1rem;border-radius:8px;word-break:break-all;white-space:pre-wrap;border:1px solid #e5e7eb"><code>THREADS_ACCESS_TOKEN={long_token}</code></pre>
            <p style="color:#6b7280;font-size:0.875rem">Valid for <strong>{days} days</strong>. Restart backend after updating <code>.env</code>.</p>
            <script>document.querySelector('pre').addEventListener('click',function(){{navigator.clipboard.writeText('{long_token}');this.style.background='#dcfce7';setTimeout(()=>this.style.background='#f3f4f6',1000)}});</script>
            <p style="color:#6b7280;font-size:0.875rem">💡 Click the token box to copy.</p>
        </body></html>""")

    except Exception as e:
        return HTMLResponse(content=f"""
        <html><body style="font-family:sans-serif;padding:2rem;max-width:600px;margin:0 auto">
            <h2 style="color:#dc2626">Token Exchange Failed</h2><p>{str(e)}</p>
        </body></html>""")


# ── Personality Analysis ───────────────────────────────────────────────────────

@app.get("/api/threads/my-posts")
async def get_my_threads_posts(limit: int = 25):
    posts = threads_service.get_user_posts_for_analysis(limit=limit)
    if not posts and not os.getenv('THREADS_ACCESS_TOKEN'):
        return {"posts": [], "connected": False, "message": "Set THREADS_ACCESS_TOKEN to fetch real posts."}
    return {"posts": posts, "connected": True, "count": len(posts)}


@app.post("/api/ai/analyze-personality")
async def analyze_personality(db: Session = Depends(get_db)):
    """Analyze personality — first try Threads API, fall back to saved DB posts"""
    posts = []

    # Try Threads API
    if os.getenv('THREADS_ACCESS_TOKEN'):
        try:
            posts = threads_service.get_user_posts_for_analysis(limit=25)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    # Fall back to posts saved in the DB
    if not posts:
        db_posts = db.query(db_models.Post).order_by(db_models.Post.created_at.desc()).limit(50).all()
        posts = [p.content for p in db_posts if p.content]

    if not posts:
        raise HTTPException(
            status_code=400,
            detail="No posts found for analysis. Create some posts first or connect your Threads account.",
        )

    result = await bedrock_service.analyze_personality(posts)
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result


class ManualPostsRequest(BaseModel):
    posts: List[str] = Field(..., min_length=1, description="List of post texts to analyze")


@app.post("/api/ai/analyze-personality/manual")
async def analyze_personality_manual(request: ManualPostsRequest):
    if len(request.posts) < 3:
        raise HTTPException(status_code=400, detail="Please provide at least 3 posts for a meaningful analysis.")
    result = await bedrock_service.analyze_personality(request.posts)
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result


@app.get("/api/ai/trending-topics")
async def get_trending_topics(category: Optional[str] = None, region: Optional[str] = None):
    result = await bedrock_service.get_trending_topics(category=category, region=region)
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result


@app.post("/api/ai/generate-personalized")
async def generate_personalized_content(request: PersonalizedContentRequest):
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
