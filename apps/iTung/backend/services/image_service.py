"""
Generates math diagram images using Google Gemini (primary) or OpenRouter (fallback),
then uploads them to Amazon S3.
Supported types: number_line, rectangle, square, triangle, circle, angle, fraction
"""
import io, os, uuid, base64, requests as _requests
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

BUCKET               = os.getenv('S3_BUCKET_NAME')
CDN_BASE             = os.getenv('S3_CDN_BASE', '')
GOOGLE_API_KEY       = os.getenv('GOOGLE_API_KEY')
GEMINI_IMAGE_MODEL   = os.getenv('GEMINI_IMAGE_MODEL', 'gemini-2.0-flash-exp')
OPENROUTER_API_KEY   = os.getenv('OPENROUTER_API_KEY')
OPENROUTER_IMAGE_MODEL = os.getenv('OPENROUTER_IMAGE_MODEL', 'black-forest-labs/flux-schnell')

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

⚠️ JANGAN TAMPILKAN:
- JANGAN tunjukkan jawaban atau hasil akhir
- JANGAN tunjukkan perhitungan atau rumus
- JANGAN tunjukkan penjelasan atau langkah penyelesaian
- Hanya tampilkan diagram dengan label informasi yang DIBERIKAN dalam soal
- TIDAK ada kotak "Keliling =" atau "Luas =" atau rumus apapun
- TIDAK ada hasil perhitungan

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

        'rectangle': f"""Buat diagram HANYA persegi panjang dengan ukuran yang diberikan dalam soal:
{question}

Spesifikasi:
- Lebar: {params.get('width', 4)} cm
- Tinggi: {params.get('height', 3)} cm
- Label UKURAN di setiap sisi dengan jelas
- JANGAN tampilkan perhitungan keliling atau luas

{only_given_info}""",

        'square': f"""Buat diagram HANYA persegi dengan ukuran yang diberikan:
{question}

Spesifikasi:
- Sisi: {params.get('side', 4)} cm
- Label sisi dengan jelas
- JANGAN tampilkan perhitungan keliling atau luas

{only_given_info}""",

        'triangle': f"""Buat diagram HANYA segitiga dengan informasi dari soal:
{question}

Informasi yang harus ditampilkan:
{params.get('given_info', 'Segitiga ABC')}

PENTING:
- Tampilkan HANYA sisi dan sudut yang disebutkan dalam soal
- Label titik sudut: A, B, C dan ukuran yang diberikan
- JANGAN tampilkan perhitungan, keliing, luas, atau rumus

{only_given_info}""",

        'circle': f"""Buat diagram HANYA lingkaran dengan informasi dari soal:
{question}

Spesifikasi:
- Jari-jari: {params.get('radius', 2)} cm
- Tampilkan dan label hanya elemen yang disebutkan dalam soal
- JANGAN tampilkan perhitungan, keliling, luas, atau rumus

{only_given_info}""",

        'angle': f"""Buat diagram HANYA sudut dengan informasi dari soal:
{question}

Spesifikasi:
- Sudut: {params.get('degrees', 60)}°
- Tampilkan dua sinar membentuk sudut dengan busur
- Label sudut dengan nilai derajatnya SAJA
- JANGAN tampilkan perhitungan atau penjelasan

{only_given_info}""",

        'fraction': f"""Buat diagram HANYA pecahan tanpa hasil perhitungan:
{question}

Spesifikasi:
- Pecahan: {params.get('numerator', 3)}/{params.get('denominator', 4)}
- Bagi persegi/kotak menjadi {params.get('denominator', 4)} bagian
- Arsir/warnai {params.get('numerator', 3)} bagian
- Label pecahan dengan jelas
- JANGAN tampilkan perhitungan atau hasil

{only_given_info}""",
    }

    return prompts.get(image_type, f"""Buat diagram matematika akurat berdasarkan soal ini:
{question}

{only_given_info}""")


def _generate_with_openrouter(prompt: str) -> bytes | None:
    """Generate image via OpenRouter images/generations endpoint as fallback."""
    if not OPENROUTER_API_KEY:
        return None
    try:
        resp = _requests.post(
            "https://openrouter.ai/api/v1/images/generations",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENROUTER_IMAGE_MODEL,
                "prompt": prompt,
                "n": 1,
                "response_format": "b64_json",
            },
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        item = data["data"][0]
        if item.get("b64_json"):
            return base64.b64decode(item["b64_json"])
        if item.get("url"):
            img_resp = _requests.get(item["url"], timeout=30)
            img_resp.raise_for_status()
            return img_resp.content
        print("[image_service] OpenRouter returned no image data")
        return None
    except Exception as e:
        print(f"[image_service] OpenRouter image generation failed: {e}")
        return None


def _generate_image(prompt: str) -> bytes | None:
    """Try Gemini first; fall back to OpenRouter if Gemini fails or returns nothing."""
    result = _generate_with_gemini(prompt)
    if result is None and OPENROUTER_API_KEY:
        print("[image_service] Gemini returned no image, trying OpenRouter fallback")
        result = _generate_with_openrouter(prompt)
    return result


_GENERATORS = {
    'number_line': lambda p, t, q: _upload(_generate_image(_create_prompt('number_line', p, q)), t),
    'rectangle':   lambda p, t, q: _upload(_generate_image(_create_prompt('rectangle', p, q)), t),
    'square':      lambda p, t, q: _upload(_generate_image(_create_prompt('square', p, q)), t),
    'triangle':    lambda p, t, q: _upload(_generate_image(_create_prompt('triangle', p, q)), t),
    'circle':      lambda p, t, q: _upload(_generate_image(_create_prompt('circle', p, q)), t),
    'angle':       lambda p, t, q: _upload(_generate_image(_create_prompt('angle', p, q)), t),
    'fraction':    lambda p, t, q: _upload(_generate_image(_create_prompt('fraction', p, q)), t),
    'custom':      lambda p, t, q: _upload(_generate_image(p.get('prompt', '')), t),
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
