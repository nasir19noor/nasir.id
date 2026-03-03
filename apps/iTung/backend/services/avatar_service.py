"""
Handles profile photo upload to S3 and AI cartoon generation via Replicate.
S3 paths:
  avatars/{user_id}/original.{ext}  — uploaded photo
  avatars/{user_id}/cartoon.png     — AI-generated cartoon
"""
import io, os
import boto3
import requests as http_requests

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


def _s3_url(key: str) -> str:
    base = CDN_BASE.rstrip('/') or f"https://{BUCKET}.s3.amazonaws.com"
    return f"{base}/{key}"


def upload_original(file_bytes: bytes, user_id: int, content_type: str) -> str:
    ext = content_type.split('/')[-1] if '/' in content_type else 'jpg'
    key = f"avatars/{user_id}/original.{ext}"
    _get_s3().upload_fileobj(
        io.BytesIO(file_bytes), BUCKET, key,
        ExtraArgs={'ContentType': content_type, 'ACL': 'public-read'},
    )
    return _s3_url(key)


def generate_cartoon(original_url: str, user_id: int) -> str | None:
    token = os.getenv('REPLICATE_API_TOKEN')
    if not token:
        print("[avatar_service] REPLICATE_API_TOKEN not set, skipping cartoon generation")
        return None
    try:
        import replicate
        client = replicate.Client(api_token=token)
        output = client.run(
            "fofr/face-to-many:a07f252abbbd832009640b27f063ea52d87d7a23a185abfa80e6cad91957f273",
            input={
                "image": original_url,
                "style": "Cartoon",
                "prompt": "cartoon character, cute, colorful, math student",
                "negative_prompt": "ugly, blurry, distorted",
                "num_outputs": 1,
            }
        )
        if not output:
            return None

        # Download the cartoon image and re-upload to our S3
        img_url = str(output[0])
        resp = http_requests.get(img_url, timeout=60)
        resp.raise_for_status()

        key = f"avatars/{user_id}/cartoon.png"
        _get_s3().upload_fileobj(
            io.BytesIO(resp.content), BUCKET, key,
            ExtraArgs={'ContentType': 'image/png', 'ACL': 'public-read'},
        )
        return _s3_url(key)

    except Exception as e:
        print(f"[avatar_service] Cartoon generation failed: {e}")
        return None
