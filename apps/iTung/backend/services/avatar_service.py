"""
Handles profile photo upload to S3 and local cartoon effect generation.
S3 paths:
  avatars/{user_id}/original.{ext}  — uploaded photo
  avatars/{user_id}/cartoon.png     — cartoon-style version
"""
import io, os
import boto3
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

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
        ExtraArgs={'ContentType': content_type},
    )
    return _s3_url(key)


def _apply_cartoon_effect(image_bytes: bytes) -> bytes:
    """Apply a cartoon-style effect using Pillow + numpy (no external API)."""
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')

    # Resize if too large to keep processing fast
    max_size = 800
    if max(img.size) > max_size:
        img.thumbnail((max_size, max_size), Image.LANCZOS)

    # Boost saturation and contrast for vivid cartoon look
    img = ImageEnhance.Color(img).enhance(2.0)
    img = ImageEnhance.Contrast(img).enhance(1.3)

    # Smooth the image to reduce detail (flat cartoon areas)
    smoothed = img
    for _ in range(6):
        smoothed = smoothed.filter(ImageFilter.SMOOTH)

    # Quantize to a limited palette (flat cartoon colors)
    quantized = smoothed.quantize(colors=20).convert('RGB')

    # Detect edges on the original grayscale image
    gray = img.convert('L')
    edges = gray.filter(ImageFilter.FIND_EDGES)

    # Threshold edges to get clean black lines
    edge_arr = np.array(edges)
    edge_mask = edge_arr > 25  # pixels above threshold are edges

    # Apply dark outlines onto cartoon colors
    result = np.array(quantized)
    result[edge_mask] = (result[edge_mask] * 0.2).astype(np.uint8)

    out = io.BytesIO()
    Image.fromarray(result).save(out, format='PNG')
    return out.getvalue()


def generate_cartoon(file_bytes: bytes, user_id: int) -> str | None:
    """Generate a cartoon version locally and upload to S3."""
    try:
        cartoon_bytes = _apply_cartoon_effect(file_bytes)
        key = f"avatars/{user_id}/cartoon.png"
        _get_s3().upload_fileobj(
            io.BytesIO(cartoon_bytes), BUCKET, key,
            ExtraArgs={'ContentType': 'image/png'},
        )
        return _s3_url(key)
    except Exception as e:
        print(f"[avatar_service] Cartoon generation failed: {e}")
        return None
