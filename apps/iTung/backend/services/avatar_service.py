"""
Handles profile photo upload to S3 and cartoon generation via Google Gemini.
S3 paths:
  avatars/{user_id}/{date}-original.jpg     — uploaded photo
  avatars/{user_id}/{date}-avatar.jpg       — cartoon-style version (Gemini generated)
"""
import io, os
from datetime import datetime
import boto3
from google import genai
from google.genai import types as genai_types

_s3 = None

def _get_s3():
    global _s3
    if _s3 is None:
        _s3 = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION', 'ap-southeast-1'),
        )
    return _s3

BUCKET   = os.getenv('S3_BUCKET_NAME')
CDN_BASE = os.getenv('S3_CDN_BASE', '')
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
GEMINI_IMAGE_MODEL = os.getenv('GEMINI_IMAGE_MODEL', 'gemini-3-pro-image-preview')

_genai_client = genai.Client(api_key=GOOGLE_API_KEY) if GOOGLE_API_KEY else None


def _s3_url(key: str) -> str:
    base = CDN_BASE.rstrip('/') or f"https://{BUCKET}.s3.amazonaws.com"
    return f"{base}/{key}"


def _get_date_string() -> str:
    """Get current timestamp in YYYYMMDDHHMMSS format."""
    return datetime.now().strftime('%Y%m%d%H%M%S')


def upload_original(file_bytes: bytes, user_id: int, content_type: str) -> str:
    """Upload original image to S3 with date prefix."""
    ext = 'jpg' if 'jpeg' in content_type.lower() else content_type.split('/')[-1] if '/' in content_type else 'jpg'
    date_str = _get_date_string()
    key = f"avatars/{user_id}/{date_str}-original.{ext}"
    
    _get_s3().upload_fileobj(
        io.BytesIO(file_bytes), BUCKET, key,
        ExtraArgs={'ContentType': content_type},
    )
    return _s3_url(key)


def generate_cartoon(file_bytes: bytes, user_id: int, age: int = None, race: str = "Asian") -> str | None:
    """Generate a Pixar-style cartoon avatar using Google Gemini and upload to S3."""
    if not _genai_client:
        print("[avatar_service] GOOGLE_API_KEY not set, skipping cartoon generation")
        return None
    
    try:
        # Create prompt based on user age and race
        age_str = f"a {age} year-old" if age else "an adult"
        prompt = f"""Transform this uploaded photo into a Pixar-style 3D cartoon portrait.
The person is a {race} {age_str}. Make it cute, colorful, animated, and friendly with exaggerated 
cartoon features like big expressive eyes. High quality, professional cartoon illustration style."""
        
        # Generate cartoon using Gemini with image generation
        response = _genai_client.models.generate_content(
            model=GEMINI_IMAGE_MODEL,
            contents=[
                prompt,
                genai_types.Part.from_bytes(
                    data=file_bytes,
                    mime_type='image/jpeg'
                )
            ],
            config=genai_types.GenerateContentConfig(
                response_modalities=['IMAGE', 'TEXT'],
            ),
        )
        
        # Extract generated image
        cartoon_bytes = None
        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                cartoon_bytes = part.inline_data.data
                break
        
        if not cartoon_bytes:
            print("[avatar_service] No cartoon image generated")
            return None
        
        # Upload to S3
        date_str = _get_date_string()
        key = f"avatars/{user_id}/{date_str}-avatar.jpg"
        
        _get_s3().upload_fileobj(
            io.BytesIO(cartoon_bytes), BUCKET, key,
            ExtraArgs={'ContentType': 'image/jpeg'},
        )
        
        return _s3_url(key)
        
    except Exception as e:
        print(f"[avatar_service] Cartoon generation failed: {e}")
        return None
