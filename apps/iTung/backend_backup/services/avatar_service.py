"""
Handles profile photo upload to S3 and cartoon generation via OpenRouter.
S3 paths:
  avatars/{user_id}/{date}-original.{ext}  — uploaded photo
  avatars/{user_id}/{date}-avatar.jpg      — cartoon-style version (OpenRouter generated)
"""
import io, os, base64, requests as _requests
from datetime import datetime
import boto3

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

BUCKET                 = os.getenv('S3_BUCKET_NAME')
CDN_BASE               = os.getenv('S3_CDN_BASE', '')
OPENROUTER_API_KEY     = os.getenv('OPENROUTER_API_KEY')
OPENROUTER_IMAGE_MODEL = os.getenv('OPENROUTER_IMAGE_MODEL')


def _s3_url(key: str) -> str:
    base = CDN_BASE.rstrip('/') or f"https://{BUCKET}.s3.amazonaws.com"
    return f"{base}/{key}"


def _get_date_string() -> str:
    return datetime.now().strftime('%Y%m%d%H%M%S')


def upload_original(file_bytes: bytes, user_id: int, content_type: str) -> str:
    """Upload original image to S3 with date prefix."""
    try:
        ext = 'jpg' if 'jpeg' in content_type.lower() else content_type.split('/')[-1] if '/' in content_type else 'jpg'
        key = f"avatars/{user_id}/{_get_date_string()}-original.{ext}"

        print(f"[avatar_service.upload_original] Uploading to S3: {key}")
        _get_s3().upload_fileobj(
            io.BytesIO(file_bytes), BUCKET, key,
            ExtraArgs={'ContentType': content_type},
        )
        url = _s3_url(key)
        print(f"[avatar_service.upload_original] Success: {url}")
        return url
    except Exception as e:
        print(f"[avatar_service.upload_original] Error: {e}")
        import traceback
        traceback.print_exc()
        return None


def generate_cartoon(file_bytes: bytes, user_id: int, age: int = None, race: str = "Asian") -> str | None:
    """Generate a Pixar-style cartoon avatar via OpenRouter and upload to S3."""
    if not OPENROUTER_API_KEY:
        print("[avatar_service.generate_cartoon] OPENROUTER_API_KEY not set, skipping")
        return None
    if not OPENROUTER_IMAGE_MODEL:
        print("[avatar_service.generate_cartoon] OPENROUTER_IMAGE_MODEL not set, skipping")
        return None

    try:
        age_str = f"a {age} year-old" if age else "an adult"
        prompt = (
            f"Transform this uploaded photo into a Pixar-style 3D cartoon portrait. "
            f"The person is a {race} {age_str}. Make it cute, colorful, animated, and friendly with exaggerated "
            f"cartoon features like big expressive eyes. High quality, professional cartoon illustration style."
        )

        b64_image = base64.b64encode(file_bytes).decode("utf-8")

        print(f"[avatar_service.generate_cartoon] Calling OpenRouter | model={OPENROUTER_IMAGE_MODEL} | user={user_id}")
        resp = _requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENROUTER_IMAGE_MODEL,
                "modalities": ["image"],
                "messages": [{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"}},
                    ],
                }],
            },
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        message = data["choices"][0]["message"]

        cartoon_bytes = None

        images = message.get("images") or []
        if images:
            item = images[0]
            if isinstance(item, str):
                cartoon_bytes = base64.b64decode(item.split(",", 1)[-1])
                print(f"[avatar_service.generate_cartoon] Image extracted (base64 str): {len(cartoon_bytes)} bytes")
            elif isinstance(item, dict):
                if item.get("b64_json"):
                    cartoon_bytes = base64.b64decode(item["b64_json"])
                    print(f"[avatar_service.generate_cartoon] Image extracted (b64_json): {len(cartoon_bytes)} bytes")
                elif item.get("url"):
                    img_resp = _requests.get(item["url"], timeout=30)
                    img_resp.raise_for_status()
                    cartoon_bytes = img_resp.content
                    print(f"[avatar_service.generate_cartoon] Image downloaded (url dict): {len(cartoon_bytes)} bytes")

        if not cartoon_bytes:
            content = message.get("content", "")
            if content and content.startswith("http"):
                img_resp = _requests.get(content, timeout=30)
                img_resp.raise_for_status()
                cartoon_bytes = img_resp.content
                print(f"[avatar_service.generate_cartoon] Image downloaded (url content): {len(cartoon_bytes)} bytes")

        if not cartoon_bytes:
            print(f"[avatar_service.generate_cartoon] No image in response: {data}")
            return None

        key = f"avatars/{user_id}/{_get_date_string()}-avatar.jpg"
        print(f"[avatar_service.generate_cartoon] Uploading to S3: {key}")
        _get_s3().upload_fileobj(
            io.BytesIO(cartoon_bytes), BUCKET, key,
            ExtraArgs={'ContentType': 'image/jpeg'},
        )
        url = _s3_url(key)
        print(f"[avatar_service.generate_cartoon] Success: {url}")
        return url

    except Exception as e:
        print(f"[avatar_service.generate_cartoon] Error: {e}")
        import traceback
        traceback.print_exc()
        return None
