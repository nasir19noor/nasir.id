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
GEMINI_IMAGE_MODEL = os.getenv('GEMINI_IMAGE_MODEL', 'gemini-3-pro-image-preview')

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
            model=GEMINI_IMAGE_MODEL,
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


def _create_prompt(image_type: str, params: dict, question: str = "") -> str:
    """Create a detailed prompt for Gemini to generate the appropriate math diagram."""
    
    # Critical instructions - ONLY show explicitly provided information
    only_given_info = """
PENTING: Buat diagram yang akurat berdasarkan informasi dalam soal.
- Tampilkan SEMUA informasi penting yang disebutkan dalam soal
- Label dengan jelas semua ukuran, sudut, dan nilai yang diberikan
- Pastikan diagram AKURAT dan SESUAI dengan deskripsi soal
- Gaya profesional: bersih, terang, latar putih, mudah dibaca
- Jangan menambahkan informasi yang tidak ada atau kesalahan

Konteks soal: {question}
"""

    prompts = {
        'number_line': f"""Buat diagram garis bilangan yang akurat berdasarkan soal ini:
{question}

Spesifikasi:
- Rentang: dari {params.get('start', 0)} sampai {params.get('end', 20)}
- Tandai angka-angka: {params.get('marked', [])} dengan titik dan label jelas
- Informasi: {params.get('given_info', 'Garis bilangan dengan angka-angka tertanda')}

{only_given_info}""",

        'rectangle': f"""Buat diagram persegi panjang yang akurat berdasarkan soal ini:
{question}

Spesifikasi:
- Lebar: {params.get('width', 4)} cm
- Tinggi: {params.get('height', 3)} cm
- Informasi: {params.get('given_info', 'Persegi panjang dengan dimensi')}
- Label SEMUA ukuran di sisi-sisinya dengan jelas

{only_given_info}""",

        'square': f"""Buat diagram persegi yang akurat berdasarkan soal ini:
{question}

Spesifikasi:
- Sisi: {params.get('side', 4)} cm
- Informasi: {params.get('given_info', 'Persegi dengan sisi tertentu')}
- Label sisi dengan jelas

{only_given_info}""",

        'triangle': f"""Buat diagram segitiga yang AKURAT berdasarkan soal ini:
{question}

Informasi yang harus ditampilkan:
{params.get('given_info', 'Segitiga ABC')}

PENTING:
- Tampilkan SEMUA sisi dan sudut yang disebutkan dalam soal
- Label titik sudut: A, B, C
- Tulis panjang sisi dan sudut di dekat garis/sudut yang sesuai
- Pastikan proporsi dan akurasi diagram sesuai soal
- Jika ada tinggi/median/garis bagi, tampilkan JIKA disebutkan dalam soal

{only_given_info}""",

        'circle': f"""Buat diagram lingkaran yang akurat berdasarkan soal ini:
{question}

Spesifikasi:
- Informasi: {params.get('given_info', f'Lingkaran dengan jari-jari {params.get("radius", 2)} cm')}
- Jari-jari: {params.get('radius', 2)} cm
- Tampilkan dan label semua elemen yang disebutkan dalam soal

{only_given_info}""",

        'angle': f"""Buat diagram sudut yang AKURAT berdasarkan soal ini:
{question}

Spesifikasi:
- Sudut: {params.get('degrees', 60)}°
- Informasi: {params.get('given_info', f'Sudut {params.get("degrees", 60)} derajat')}
- Tampilkan dua sinar membentuk sudut dengan busur
- Label sudut dengan nilai derajatnya

{only_given_info}""",

        'fraction': f"""Buat diagram pecahan yang akurat berdasarkan soal ini:
{question}

Spesifikasi:
- Pecahan: {params.get('numerator', 3)}/{params.get('denominator', 4)}
- Informasi: {params.get('given_info', f'Pecahan {params.get("numerator", 3)}/{params.get("denominator", 4)}')}
- Bagi persegi/kotak menjadi {params.get('denominator', 4)} bagian
- Arsir/warnai {params.get('numerator', 3)} bagian
- Label pecahan dengan jelas

{only_given_info}""",
    }

    return prompts.get(image_type, f"""Buat diagram matematika akurat berdasarkan soal ini:
{question}

{only_given_info}""")


_GENERATORS = {
    'number_line': lambda p, t, q: _upload(_generate_with_gemini(_create_prompt('number_line', p, q)), t),
    'rectangle':   lambda p, t, q: _upload(_generate_with_gemini(_create_prompt('rectangle', p, q)), t),
    'square':      lambda p, t, q: _upload(_generate_with_gemini(_create_prompt('square', p, q)), t),
    'triangle':    lambda p, t, q: _upload(_generate_with_gemini(_create_prompt('triangle', p, q)), t),
    'circle':      lambda p, t, q: _upload(_generate_with_gemini(_create_prompt('circle', p, q)), t),
    'angle':       lambda p, t, q: _upload(_generate_with_gemini(_create_prompt('angle', p, q)), t),
    'fraction':    lambda p, t, q: _upload(_generate_with_gemini(_create_prompt('fraction', p, q)), t),
    'custom':      lambda p, t, q: _upload(_generate_with_gemini(p.get('prompt', '')), t),
}


def delete_from_s3(image_url: str) -> bool:
    """Delete an image from S3 given its full URL. Returns True if successful."""
    if not image_url:
        return False
    
    try:
        base = CDN_BASE.rstrip('/') or f"https://{BUCKET}.s3.amazonaws.com"
        # Remove CDN base URL to get the S3 key
        if image_url.startswith(base):
            key = image_url[len(base):].lstrip('/')
        else:
            # Handle case where URL has different format
            key = image_url.split(BUCKET)[-1].lstrip('/')
        
        _get_s3().delete_object(Bucket=BUCKET, Key=key)
        print(f"[image_service] Deleted S3 object: {key}")
        return True
    except Exception as e:
        print(f"[image_service] S3 delete failed for {image_url}: {e}")
        return False


def generate(image_type: str, params: dict, topic: str = "general", question: str = "") -> str | None:
    """Generate a math diagram image using Gemini and upload to S3. Returns the public URL or None on failure."""
    gen = _GENERATORS.get(image_type)
    if gen is None:
        return None
    try:
        return gen(params, topic, question)
    except Exception as e:
        print(f"[image_service] Failed to generate '{image_type}': {e}")
        return None
