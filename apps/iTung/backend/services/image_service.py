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


def _create_prompt(image_type: str, params: dict) -> str:
    """Create a detailed prompt for Gemini to generate the appropriate math diagram."""
    
    # Critical instructions - ONLY show explicitly provided information
    only_given_info = """
PENTING: Hanya tampilkan INFORMASI YANG DIBERIKAN dalam soal saja.
JANGAN tampilkan:
- Nilai yang harus dihitung/dicari (jawaban)
- Sudut atau panjang yang bukan bagian dari pertanyaan awal
- Hasil perhitungan atau turunan dari informasi yang diberikan
- Dekorasi atau informasi tambahan apapun

Hanya tampilkan label, ukuran, dan sudut yang SECARA EKSPLISIT diberikan dalam soal.
TIDAK ada informasi lain, hasil perhitungan, atau nilai yang dapat diketahui dari soal.
"""

    prompts = {
        'number_line': f"""Buat diagram garis bilangan yang bersih dan profesional.
Rentang: dari {params.get('start', 0)} sampai {params.get('end', 20)}
Tandai dengan titik dan label angka-angka: {params.get('marked', [])}
Gaya: hitam dan putih, terang, sederhana, latar putih bersih.
{only_given_info}""",

        'rectangle': f"""Buat diagram persegi panjang yang bersih dan profesional.
Dimensi: Lebar {params.get('width', 4)} cm, Tinggi {params.get('height', 3)} cm
Label HANYA ukuran di sisi-sisi: lebar dan tinggi.
Jangan tampilkan luas, keliling, atau nilai apapun yang bukan dimensi yang diberikan.
Gaya: garis biru, latar putih bersih, terang, sederhana.
{only_given_info}""",

        'square': f"""Buat diagram persegi yang bersih dan profesional.
Panjang sisi: {params.get('side', 4)} cm
Label HANYA satu sisi saja dengan panjangnya.
Jangan tampilkan luas, keliling, atau informasi yang dihitung.
Gaya: garis biru tua, latar putih bersih, terang, sederhana.
{only_given_info}""",

        'triangle': f"""Buat diagram segitiga yang bersih dan profesional.
Informasi yang diberikan dalam soal:
{params.get('given_info', 'Segitiga ABC dengan titik sudut berlabel A, B, C')}

Label HANYA informasi yang diberikan di atas. Tidak boleh ada:
- Sudut yang dihitung
- Panjang sisi yang tidak disebutkan
- Tinggi atau garis bantu yang tidak diminta
- Nilai apapun selain yang EKSPLISIT dalam daftar informasi

Jika ada garis khusus (seperti tinggi/median/garis bagi), tampilkan HANYA jika diberikan dalam soal.
Gaya: garis biru tua, latar putih bersih, terang, sederhana, hanya apa yang perlu.
{only_given_info}""",

        'circle': f"""Buat diagram lingkaran yang bersih dan profesional.
Informasi yang diberikan:
{params.get('given_info', f'Lingkaran dengan jari-jari {params.get("radius", 2)} cm')}

Label HANYA informasi di atas. Jangan tampilkan luas, keliling, atau perhitungan lain.
Gaya: garis biru tua, latar putih bersih, terang, sederhana.
{only_given_info}""",

        'angle': f"""Buat diagram sudut yang bersih dan profesional.
Informasi yang diberikan:
{params.get('given_info', f'Sudut {params.get("degrees", 60)} derajat')}

Label HANYA informasi di atas. Tampilkan dua sinar yang membentuk sudut dengan busur dan label derajat.
Jangan tambahkan informasi lain.
Gaya: sinar biru tua, busur merah, latar putih bersih, terang, sederhana.
{only_given_info}""",

        'fraction': f"""Buat diagram pecahan yang bersih dan profesional.
Pecahan: {params.get('numerator', 3)}/{params.get('denominator', 4)}

Tampilkan persegi/kotak yang dibagi menjadi {params.get('denominator', 4)} bagian dengan {params.get('numerator', 3)} bagian diarsir/berwarna.
Label pecahan. Jangan tampilkan desimal, persen, atau informasi lain.
Gaya: garis biru tua, area terisi biru muda, latar putih bersih, terang, sederhana.
{only_given_info}""",
    }

    return prompts.get(image_type, f"Buat diagram matematika yang sederhana dan profesional. Hanya tampilkan informasi yang diberikan dalam soal. {only_given_info}")


_GENERATORS = {
    'number_line': lambda p, t: _upload(_generate_with_gemini(_create_prompt('number_line', p)), t),
    'rectangle':   lambda p, t: _upload(_generate_with_gemini(_create_prompt('rectangle', p)), t),
    'square':      lambda p, t: _upload(_generate_with_gemini(_create_prompt('square', p)), t),
    'triangle':    lambda p, t: _upload(_generate_with_gemini(_create_prompt('triangle', p)), t),
    'circle':      lambda p, t: _upload(_generate_with_gemini(_create_prompt('circle', p)), t),
    'angle':       lambda p, t: _upload(_generate_with_gemini(_create_prompt('angle', p)), t),
    'fraction':    lambda p, t: _upload(_generate_with_gemini(_create_prompt('fraction', p)), t),
    'custom':      lambda p, t: _upload(_generate_with_gemini(p.get('prompt', '')), t),
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
