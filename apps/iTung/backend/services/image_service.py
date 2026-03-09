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
    no_answer = "JANGAN tampilkan jawaban, hasil perhitungan, atau penyelesaian — hanya tampilkan informasi yang ada pada soal."

    prompts = {
        'number_line': f"""Buat ilustrasi matematika yang bersih dan edukatif berupa diagram garis bilangan.
        Rentang: dari {params.get('start', 0)} sampai {params.get('end', 20)}
        Tandai angka-angka berikut dengan titik merah: {params.get('marked', [])}
        Gaya: Sederhana, jelas, latar putih, gaya edukatif profesional.
        Gunakan garis dan angka hitam, titik merah untuk angka yang ditandai.
        Label dalam Bahasa Indonesia. {no_answer}""",

        'rectangle': f"""Buat ilustrasi matematika yang bersih dan edukatif berupa diagram persegi panjang.
        Lebar: {params.get('width', 4)} cm
        Tinggi: {params.get('height', 3)} cm
        Tampilkan ukuran berlabel di setiap sisi. Biarkan area dalam kosong (tidak ada label luas atau nilai lain).
        Gaya: Sederhana, jelas, latar putih, gaya edukatif profesional.
        Gunakan garis luar biru, isi biru muda, dengan label ukuran yang jelas.
        Label dalam Bahasa Indonesia. {no_answer}""",

        'square': f"""Buat ilustrasi matematika yang bersih dan edukatif berupa diagram persegi.
        Panjang sisi: {params.get('side', 4)} cm
        Tampilkan ukuran berlabel di salah satu sisi saja. Biarkan area dalam kosong.
        Gaya: Sederhana, jelas, latar putih, gaya edukatif profesional.
        Gunakan garis luar biru, isi biru muda, dengan label yang jelas.
        Label dalam Bahasa Indonesia. {no_answer}""",

        'triangle': f"""Buat ilustrasi matematika yang bersih dan edukatif berupa diagram segitiga.
        Tampilkan segitiga yang jelas dengan tiga titik sudut berlabel A, B, C.
        Gaya: Sederhana, jelas, latar putih, gaya edukatif profesional.
        Gunakan garis luar biru, isi biru muda.
        Label dalam Bahasa Indonesia. {no_answer}""",

        'circle': f"""Buat ilustrasi matematika yang bersih dan edukatif berupa diagram lingkaran.
        Jari-jari: {params.get('radius', 2)} cm
        Gambar garis dari pusat ke tepi berlabel "r = {params.get('radius', 2)} cm". Tidak perlu tampilkan luas atau keliling.
        Gaya: Sederhana, jelas, latar putih, gaya edukatif profesional.
        Gunakan garis luar biru, isi biru muda, garis jari-jari merah.
        Label dalam Bahasa Indonesia. {no_answer}""",

        'angle': f"""Buat ilustrasi matematika yang bersih dan edukatif berupa diagram sudut.
        Sudut: {params.get('degrees', 60)} derajat
        Tampilkan dua sinar yang membentuk sudut dengan busur dan label derajatnya saja.
        Gaya: Sederhana, jelas, latar putih, gaya edukatif profesional.
        Gunakan sinar biru, busur merah, dengan label derajat.
        Label dalam Bahasa Indonesia. {no_answer}""",

        'fraction': f"""Buat ilustrasi matematika yang bersih dan edukatif berupa diagram pecahan.
        Pecahan: {params.get('numerator', 3)}/{params.get('denominator', 4)}
        Tampilkan kotak/batang yang dibagi menjadi {params.get('denominator', 4)} bagian dengan {params.get('numerator', 3)} bagian diarsir. Hanya tampilkan diagram, tidak perlu hasil desimal atau persen.
        Gaya: Sederhana, jelas, latar putih, gaya edukatif profesional.
        Gunakan garis luar biru, arsiran biru untuk bagian terisi, dengan label pecahan.
        Label dalam Bahasa Indonesia. {no_answer}""",
    }

    return prompts.get(image_type, f"Buat diagram matematika yang sederhana dan edukatif dengan gaya profesional, label dalam Bahasa Indonesia. {no_answer}")


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
