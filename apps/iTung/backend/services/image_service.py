"""
Generates math diagram images using Google Gemini and uploads them to Amazon S3.
Supported types: number_line, rectangle, square, triangle, circle, angle, fraction
"""
import io, os, uuid
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

_genai_client = genai.Client(api_key=GOOGLE_API_KEY) if GOOGLE_API_KEY else None


def _upload(image_bytes: bytes, topic: str = "general") -> str | None:
    """Upload image bytes to S3 and return the public URL."""
    if not image_bytes:
        print("[image_service] No image bytes to upload")
        return None
    
    try:
        buf = io.BytesIO(image_bytes)
        
        # Create URL-safe topic slug (replace spaces with hyphens)
        topic_slug = topic.replace(" ", "-").lower()
        
        # Create path with topic/year/month/day structure
        now = datetime.now()
        year = now.strftime('%Y')
        month = now.strftime('%m')
        day = now.strftime('%d')
        filename = f"{uuid.uuid4()}.png"
        key = f"questions/{topic_slug}/{year}/{month}/{day}/{filename}"
        
        _get_s3().upload_fileobj(
            buf, BUCKET, key,
            ExtraArgs={'ContentType': 'image/png'},
        )
        base = CDN_BASE.rstrip('/') or f"https://{BUCKET}.s3.amazonaws.com"
        return f"{base}/{key}"
    except Exception as e:
        print(f"[image_service] S3 upload failed: {e}")
        return None


def _generate_with_gemini(prompt: str) -> bytes | None:
    """Generate image using Google Gemini and return image bytes."""
    if not _genai_client:
        print("[image_service] GOOGLE_API_KEY not set")
        return None

    try:
        response = _genai_client.models.generate_content(
            model='gemini-3.1-flash-image-preview',
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                response_modalities=['IMAGE', 'TEXT'],
            ),
        )

        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                return part.inline_data.data

        print(f"[image_service] No image generated for prompt: {prompt[:100]}")
        return None
    except Exception as e:
        print(f"[image_service] Gemini image generation failed: {e}")
        return None


def _create_prompt(image_type: str, params: dict) -> str:
    """Create a detailed prompt for Gemini to generate the appropriate math diagram."""
    prompts = {
        'number_line': f"""Create a clean, educational math visual showing a number line diagram.
        Range: from {params.get('start', 0)} to {params.get('end', 20)}
        Mark these numbers with red dots: {params.get('marked', [])}
        Style: Simple, clear, white background, professional educational style.
        Use black lines and numbers, red dots for marked points.""",
        
        'rectangle': f"""Create a clean, educational math visual showing a rectangle diagram.
        Width: {params.get('width', 4)} cm
        Height: {params.get('height', 3)} cm
        Show dimensions labeled on the sides.
        Style: Simple, clear, white background, professional educational style.
        Use blue outline, light blue fill, with clear dimension labels.""",
        
        'square': f"""Create a clean, educational math visual showing a square diagram.
        Side length: {params.get('side', 4)} cm
        Show dimension labeled on the bottom.
        Style: Simple, clear, white background, professional educational style.
        Use blue outline, light blue fill, with clear labels.""",
        
        'triangle': f"""Create a clean, educational math visual showing a triangle diagram.
        Make it a clear triangle with three vertices.
        Style: Simple, clear, white background, professional educational style.
        Use blue outline, light blue fill.""",
        
        'circle': f"""Create a clean, educational math visual showing a circle diagram.
        Radius: {params.get('radius', 2)} cm
        Draw a line from center to edge labeled as radius.
        Style: Simple, clear, white background, professional educational style.
        Use blue outline, light blue fill, red radius line.""",
        
        'angle': f"""Create a clean, educational math visual showing an angle diagram.
        Angle: {params.get('degrees', 60)} degrees
        Show two rays forming the angle with arc indicating the degrees.
        Style: Simple, clear, white background, professional educational style.
        Use blue rays, red arc, with degree label.""",
        
        'fraction': f"""Create a clean, educational math visual showing a fraction diagram.
        Fraction: {params.get('numerator', 3)}/{params.get('denominator', 4)}
        Show a bar divided into {params.get('denominator', 4)} parts with {params.get('numerator', 3)} parts shaded.
        Style: Simple, clear, white background, professional educational style.
        Use blue outline, blue shading for filled parts, with fraction label.""",
    }
    
    return prompts.get(image_type, "Create a simple, educational math diagram in professional style.")


_GENERATORS = {
    'number_line': lambda p, t: _upload(_generate_with_gemini(_create_prompt('number_line', p)), t),
    'rectangle':   lambda p, t: _upload(_generate_with_gemini(_create_prompt('rectangle', p)), t),
    'square':      lambda p, t: _upload(_generate_with_gemini(_create_prompt('square', p)), t),
    'triangle':    lambda p, t: _upload(_generate_with_gemini(_create_prompt('triangle', p)), t),
    'circle':      lambda p, t: _upload(_generate_with_gemini(_create_prompt('circle', p)), t),
    'angle':       lambda p, t: _upload(_generate_with_gemini(_create_prompt('angle', p)), t),
    'fraction':    lambda p, t: _upload(_generate_with_gemini(_create_prompt('fraction', p)), t),
}


def generate(image_type: str, params: dict, topic: str = "general") -> str | None:
    """Generate a math diagram image using Gemini and upload to S3. Returns the public URL or None on failure."""
    gen = _GENERATORS.get(image_type)
    if gen is None:
        return None
    try:
        return gen(params, topic)
    except Exception as e:
        print(f"[image_service] Failed to generate '{image_type}': {e}")
        return None
