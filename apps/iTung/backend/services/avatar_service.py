"""
Handles profile photo upload to S3 and cartoon generation via HuggingFace Inference API.
S3 paths:
  avatars/{user_id}/original.{ext}  — uploaded photo
  avatars/{user_id}/cartoon.png     — cartoon-style version
"""
import io, os, base64
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

HF_MODEL = "timbrooks/instruct-pix2pix"
HF_API_URL = f"https://api-inference.huggingface.co/models/{HF_MODEL}"


def _s3_url(key: str) -> str:
    base = CDN_BASE.rstrip('/') or f"https://{BUCKET}.s3.amazonaws.com"
    return f"{base}/{key}"


def upload_original(file_bytes: bytes, user_id: int, content_type: str) -> str:
    ext = content_type.split('/')[-1] if '/' in content_type else 'jpg'
    key = f"avatars/{user_id}/original.{ext}"
    _get_s3().upload_fileobj(
        io.BytesIO(file_bytes), BUCKET, key,
        ExtraArgs={'ContentType': content_type},
    )
    return _s3_url(key)


def generate_cartoon(file_bytes: bytes, user_id: int) -> str | None:
    """Generate a cartoon version via HuggingFace Inference API and upload to S3."""
    token = os.getenv('HF_TOKEN')
    if not token:
        print("[avatar_service] HF_TOKEN not set, skipping cartoon generation")
        return None
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        payload = {
            "inputs": base64.b64encode(file_bytes).decode(),
            "parameters": {
                "prompt": "turn into a cute cartoon character, colorful, animated, flat illustration style",
                "negative_prompt": "ugly, blurry, distorted, realistic, photo",
                "num_inference_steps": 20,
                "image_guidance_scale": 1.5,
                "guidance_scale": 7,
            },
        }
        resp = http_requests.post(HF_API_URL, headers=headers, json=payload, timeout=120)
        resp.raise_for_status()

        cartoon_bytes = resp.content
        key = f"avatars/{user_id}/cartoon.png"
        _get_s3().upload_fileobj(
            io.BytesIO(cartoon_bytes), BUCKET, key,
            ExtraArgs={'ContentType': 'image/png'},
        )
        return _s3_url(key)

    except Exception as e:
        print(f"[avatar_service] Cartoon generation failed: {e}")
        return None
