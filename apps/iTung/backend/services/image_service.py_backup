"""
Generates math diagram images using OpenRouter, then uploads them to Amazon S3.
Supported types: number_line, rectangle, square, triangle, circle, angle, fraction,
                 coordinate_plane, bar_chart, 3d_shape, trapezoid, function_graph,
                 clock, scale, venn_diagram, pie_chart, factor_tree, matrix,
                 ruler, money, tree_diagram, number_grid, custom
"""
import io, os, uuid, base64, requests as _requests
from datetime import datetime
import boto3
import anthropic

_claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

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


def _upload(image_bytes: bytes, topic: str = "general") -> str | None:
    """Upload image bytes to S3 and return the public URL."""
    if not image_bytes:
        print("[image_service] No image bytes to upload")
        return None

    try:
        buf = io.BytesIO(image_bytes)
        topic_slug = topic.replace(" ", "-").lower()
        now = datetime.now()
        key = f"questions/{topic_slug}/{now.strftime('%Y/%m/%d')}/{uuid.uuid4()}.png"
        _get_s3().upload_fileobj(buf, BUCKET, key, ExtraArgs={'ContentType': 'image/png'})
        base = CDN_BASE.rstrip('/') or f"https://{BUCKET}.s3.amazonaws.com"
        return f"{base}/{key}"
    except Exception as e:
        print(f"[image_service] S3 upload failed: {e}")
        return None


def _create_prompt(image_type: str, params: dict, question: str = "") -> str:
    """Create a detailed prompt to generate the appropriate math diagram."""

    only_given_info = f"""
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
- JANGAN tampilkan perhitungan, keliling, luas, atau rumus

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

        'coordinate_plane': f"""Buat diagram bidang koordinat kartesius berdasarkan soal ini:
{question}

Spesifikasi:
- Sumbu X: dari {params.get('x_min', -5)} sampai {params.get('x_max', 5)}
- Sumbu Y: dari {params.get('y_min', -5)} sampai {params.get('y_max', 5)}
- Titik-titik: {params.get('points', [])} — tandai dengan label koordinat jelas
- Garis/kurva: {params.get('given_info', '')}
- Tampilkan grid, label sumbu X dan Y, serta titik origin (0,0)
- JANGAN tampilkan persamaan atau hasil perhitungan

{only_given_info}""",

        'bar_chart': f"""Buat diagram batang (bar chart) berdasarkan soal ini:
{question}

Spesifikasi:
- Label kategori: {params.get('labels', [])}
- Nilai: {params.get('values', [])}
- Judul diagram: {params.get('title', 'Diagram Batang')}
- Tampilkan nilai di atas setiap batang
- Sumbu Y mulai dari 0
- JANGAN tampilkan hasil perhitungan (mean/median/modus)

{only_given_info}""",

        '3d_shape': f"""Buat diagram bangun ruang berdasarkan soal ini:
{question}

Spesifikasi:
- Bentuk: {params.get('shape', 'kubus')}
- Dimensi: {params.get('given_info', '')}
- Tampilkan bangun ruang dalam perspektif 3D yang jelas
- Label semua ukuran yang disebutkan dalam soal (panjang, lebar, tinggi, jari-jari, dll)
- Gunakan garis putus-putus untuk sisi yang tersembunyi
- JANGAN tampilkan perhitungan volume atau luas permukaan

{only_given_info}""",

        'trapezoid': f"""Buat diagram HANYA trapesium dengan ukuran yang diberikan:
{question}

Spesifikasi:
- Sisi sejajar atas: {params.get('top', 4)} cm
- Sisi sejajar bawah: {params.get('bottom', 8)} cm
- Tinggi: {params.get('height', 3)} cm
- Informasi tambahan: {params.get('given_info', '')}
- Label semua ukuran yang disebutkan dengan jelas
- JANGAN tampilkan perhitungan keliling atau luas

{only_given_info}""",

        'function_graph': f"""Buat grafik fungsi matematika berdasarkan soal ini:
{question}

Spesifikasi:
- Fungsi: {params.get('function', 'sin(x)')}
- Sumbu X: dari {params.get('x_min', -360)} sampai {params.get('x_max', 360)}
- Sumbu Y: dari {params.get('y_min', -2)} sampai {params.get('y_max', 2)}
- Informasi kunci: {params.get('given_info', '')}
- Tampilkan grid, label sumbu, dan titik-titik penting (puncak, lembah, titik potong sumbu, titik balik)
- Untuk fungsi trigonometri: tandai amplitudo, periode, dan nilai kunci (0°, 90°, 180°, 270°, 360°)
- Untuk fungsi kuadrat/polinomial: tandai titik puncak/minimum dan titik potong sumbu
- Untuk grafik turunan/integral: tampilkan area yang relevan atau garis singgung jika disebutkan
- JANGAN tampilkan rumus atau hasil perhitungan

{only_given_info}""",

        'clock': f"""Buat gambar jam analog (clock face) berdasarkan soal ini:
{question}

Spesifikasi:
- Waktu yang ditunjukkan: {params.get('time', '07:30')}
- Tampilkan jam bulat dengan angka 1–12 yang jelas
- Gambar jarum jam (pendek) dan jarum menit (panjang) pada posisi waktu yang tepat
- Jika ada jarum detik, tampilkan juga
- Label waktu di bawah jam: "{params.get('time', '07:30')}"
- Gaya bersih, latar putih, mudah dibaca anak SD
- JANGAN tampilkan jawaban atau konversi waktu

{only_given_info}""",

        'scale': f"""Buat gambar timbangan (neraca/scale) berdasarkan soal ini:
{question}

Spesifikasi:
- Tipe timbangan: {params.get('scale_type', 'neraca dua lengan')}
- Sisi kiri: {params.get('left', '')}
- Sisi kanan: {params.get('right', '')}
- Informasi: {params.get('given_info', '')}
- Untuk neraca dua lengan: tampilkan posisi seimbang atau miring sesuai soal
- Untuk timbangan jarum: tampilkan jarum menunjuk nilai yang diberikan
- Label semua berat/beban yang disebutkan dalam soal dengan jelas
- JANGAN tampilkan hasil perhitungan atau jawaban

{only_given_info}""",

        'venn_diagram': f"""Buat diagram Venn yang akurat berdasarkan soal ini:
{question}

Spesifikasi:
- Himpunan A: {params.get('set_a', [])} — label: {params.get('label_a', 'A')}
- Himpunan B: {params.get('set_b', [])} — label: {params.get('label_b', 'B')}
- Semesta: {params.get('universal', [])}
- Irisan (A∩B): {params.get('intersection', [])}
- Informasi tambahan: {params.get('given_info', '')}
- Gambar dua lingkaran oval yang saling tumpang tindih di dalam kotak semesta
- Tulis elemen masing-masing himpunan di posisi yang benar (hanya di A, hanya di B, atau di irisan)
- Label A dan B di dalam/atas lingkaran, label S atau U untuk semesta di pojok
- Gunakan warna terang yang berbeda untuk membedakan wilayah
- JANGAN tampilkan hasil operasi himpunan atau jawaban

{only_given_info}""",

        'pie_chart': f"""Buat diagram lingkaran (pie chart) berdasarkan soal ini:
{question}

Spesifikasi:
- Label kategori: {params.get('labels', [])}
- Nilai/persentase: {params.get('values', [])}
- Judul diagram: {params.get('title', 'Diagram Lingkaran')}
- Tampilkan setiap sektor dengan warna berbeda
- Label setiap sektor dengan nama kategori dan nilai/persentasenya
- Gunakan gaya bersih dan profesional, latar putih
- JANGAN tampilkan hasil perhitungan atau jawaban

{only_given_info}""",

        'factor_tree': f"""Buat diagram pohon faktor (factor tree) berdasarkan soal ini:
{question}

Spesifikasi:
- Bilangan yang difaktorkan: {params.get('number', '')}
- Informasi: {params.get('given_info', '')}
- Tampilkan pohon faktorisasi prima secara vertikal/bercabang dari atas ke bawah
- Setiap node menunjukkan pemfaktoran (misal: 12 → 2 × 6, lalu 6 → 2 × 3)
- Lingkari atau tebalkan bilangan prima di daun pohon
- Jika ada dua bilangan (untuk KPK/FPB): tampilkan dua pohon berdampingan
- JANGAN tampilkan hasil KPK/FPB atau jawaban akhir

{only_given_info}""",

        'matrix': f"""Buat tampilan matriks matematika yang rapi berdasarkan soal ini:
{question}

Spesifikasi:
- Matriks: {params.get('rows', [])}
- Label matriks: {params.get('label', 'A')}
- Informasi tambahan: {params.get('given_info', '')}
- Tampilkan matriks dalam notasi matematika standar dengan tanda kurung/bracket kotak
- Setiap elemen tertulis jelas dengan spasi rata antar kolom
- Jika ada lebih dari satu matriks (misal A dan B untuk perkalian matriks), tampilkan keduanya
- Ukuran font besar dan mudah dibaca
- Latar putih, gaya bersih dan profesional
- JANGAN tampilkan hasil operasi atau jawaban

{only_given_info}""",

        'ruler': f"""Buat gambar penggaris (ruler) berdasarkan soal ini:
{question}

Spesifikasi:
- Panjang penggaris: {params.get('length', 20)} {params.get('unit', 'cm')}
- Titik yang ditandai: {params.get('marked_points', [])}
- Satuan: {params.get('unit', 'cm')}
- Informasi: {params.get('given_info', '')}
- Gambar penggaris horizontal dengan skala yang jelas (garis centimeter dan milimeter)
- Tandai titik atau panjang yang disebutkan dalam soal dengan panah atau tanda warna
- Label angka di setiap centimeter
- Jika mengukur suatu benda: gambar benda di atas penggaris dengan ujung-ujungnya tepat
- JANGAN tampilkan hasil pengukuran atau jawaban

{only_given_info}""",

        'money': f"""Buat gambar uang (koin dan/atau lembaran) berdasarkan soal ini:
{question}

Spesifikasi:
- Pecahan/denominasi: {params.get('denominations', [])}
- Jumlah masing-masing: {params.get('amounts', [])}
- Informasi: {params.get('given_info', '')}
- Gambar koin atau lembaran uang Rupiah yang realistis dan jelas
- Label nilai nominal di setiap koin/lembaran (Rp500, Rp1.000, Rp5.000, dst)
- Susun secara rapi agar mudah dihitung
- Jika ada transaksi: tampilkan uang yang dibayar dan kembalian secara terpisah
- Gaya bersih, warna cerah, mudah dibaca anak SD
- JANGAN tampilkan hasil penjumlahan atau jawaban

{only_given_info}""",

        'tree_diagram': f"""Buat diagram pohon (tree diagram) berdasarkan soal ini:
{question}

Spesifikasi:
- Informasi: {params.get('given_info', '')}
- Cabang-cabang: {params.get('branches', [])}
- Judul: {params.get('title', 'Diagram Pohon')}
- Gambar diagram pohon dari kiri ke kanan (atau atas ke bawah)
- Setiap cabang dilabeli dengan kemungkinan/pilihan yang ada
- Tampilkan semua hasil akhir di ujung cabang (daun)
- Jika ada probabilitas: tulis nilai peluang di setiap cabang
- JANGAN tampilkan hasil perhitungan permutasi/kombinasi/peluang akhir

{only_given_info}""",

        'number_grid': f"""Buat diagram grid/array bilangan berdasarkan soal ini:
{question}

Spesifikasi:
- Baris: {params.get('rows', 3)}
- Kolom: {params.get('cols', 4)}
- Informasi: {params.get('given_info', '')}
- Gambar array kotak/lingkaran tersusun dalam baris dan kolom
- Setiap objek dilabeli atau diwarnai dengan jelas
- Untuk perkalian: tunjukkan kelompok-kelompok baris sebagai visualisasi perkalian (misal 3 × 4 = 3 baris, 4 kolom)
- Untuk pembagian: tunjukkan pembagian objek ke dalam kelompok sama besar
- Label baris dan kolom di sisi kiri dan atas
- JANGAN tampilkan hasil perkalian/pembagian atau jawaban

{only_given_info}""",
    }

    return prompts.get(image_type, f"""Buat diagram matematika akurat berdasarkan soal ini:
{question}

{only_given_info}""")


def _generate_image(prompt: str) -> bytes | None:
    """Generate image via OpenRouter chat completions endpoint."""
    if not OPENROUTER_API_KEY:
        print("[image_service] OpenRouter skipped: OPENROUTER_API_KEY not set")
        return None
    if not OPENROUTER_IMAGE_MODEL:
        print("[image_service] OpenRouter skipped: OPENROUTER_IMAGE_MODEL not set")
        return None
    print(f"[image_service] Using OpenRouter | model={OPENROUTER_IMAGE_MODEL}")
    print(f"[image_service] Prompt preview: {prompt[:200].strip()!r}")
    try:
        resp = _requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENROUTER_IMAGE_MODEL,
                "modalities": ["image", "text"],
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        print(f"[image_service] OpenRouter raw response keys: {list(data.get('choices', [{}])[0].get('message', {}).keys())}")
        message = data["choices"][0]["message"]

        # Images returned in message.images[] — can be a string data URL or a dict
        images = message.get("images") or []
        if images:
            item = images[0]
            if isinstance(item, str):
                b64 = item.split(",", 1)[-1]
                print("[image_service] OpenRouter image generated successfully (base64 str)")
                return base64.b64decode(b64)
            if isinstance(item, dict):
                if item.get("b64_json"):
                    print("[image_service] OpenRouter image generated successfully (b64_json)")
                    return base64.b64decode(item["b64_json"])
                # Nested format: {"type": "image_url", "image_url": {"url": "data:..."}}
                nested_url = (item.get("image_url") or {}).get("url", "")
                if nested_url:
                    if nested_url.startswith("data:"):
                        b64 = nested_url.split(",", 1)[-1]
                        print("[image_service] OpenRouter image generated successfully (nested image_url data URI)")
                        return base64.b64decode(b64)
                    print("[image_service] OpenRouter image generated successfully (nested image_url external)")
                    img_resp = _requests.get(nested_url, timeout=30)
                    img_resp.raise_for_status()
                    return img_resp.content
                if item.get("url"):
                    url = item["url"]
                    if url.startswith("data:"):
                        b64 = url.split(",", 1)[-1]
                        print("[image_service] OpenRouter image generated successfully (data URI url)")
                        return base64.b64decode(b64)
                    print("[image_service] OpenRouter image generated successfully (url dict)")
                    img_resp = _requests.get(url, timeout=30)
                    img_resp.raise_for_status()
                    return img_resp.content

        # Fallback: some models return a URL in content
        content = message.get("content", "")
        if content and content.startswith("http"):
            print("[image_service] OpenRouter image generated successfully (url content)")
            img_resp = _requests.get(content, timeout=30)
            img_resp.raise_for_status()
            return img_resp.content

        print(f"[image_service] OpenRouter returned no image data. Full message: {message}")
        return None
    except Exception as e:
        print(f"[image_service] OpenRouter image generation failed: {e}")
        return None


def _verify_image(image_bytes: bytes, image_type: str, params: dict, question: str) -> tuple[bool, str]:
    """Send image to Claude Vision. Returns (is_valid, feedback) where feedback explains what's wrong."""
    try:
        b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
        verify_prompt = f"""Kamu adalah guru matematika yang memeriksa diagram soal.

Soal: {question}
Tipe diagram yang diharapkan: {image_type}
Parameter: {params}

Periksa gambar ini:
1. Apakah tipe diagram sudah benar (sesuai image_type)?
2. Apakah nilai/ukuran yang ditampilkan sudah TEPAT sesuai parameter?
3. Apakah gambar TIDAK menampilkan jawaban atau hasil perhitungan?

Jika benar, balas: VALID
Jika salah, balas: INVALID: [jelaskan secara singkat apa yang salah dan harus diperbaiki]"""

        msg = _claude.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=100,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": b64}},
                    {"type": "text", "text": verify_prompt},
                ],
            }]
        )
        result = msg.content[0].text.strip()
        print(f"[image_service] image verification: {result}")
        if result.upper().startswith("VALID"):
            return True, ""
        feedback = result[result.find(":") + 1:].strip() if ":" in result else result
        return False, feedback
    except Exception as e:
        print(f"[image_service] image verification failed: {e} — accepting image anyway")
        return True, ""  # fail open


_GENERATORS = {
    'number_line':      lambda p, t, q: _upload(_generate_image(_create_prompt('number_line', p, q)), t),
    'rectangle':        lambda p, t, q: _upload(_generate_image(_create_prompt('rectangle', p, q)), t),
    'square':           lambda p, t, q: _upload(_generate_image(_create_prompt('square', p, q)), t),
    'triangle':         lambda p, t, q: _upload(_generate_image(_create_prompt('triangle', p, q)), t),
    'circle':           lambda p, t, q: _upload(_generate_image(_create_prompt('circle', p, q)), t),
    'angle':            lambda p, t, q: _upload(_generate_image(_create_prompt('angle', p, q)), t),
    'fraction':         lambda p, t, q: _upload(_generate_image(_create_prompt('fraction', p, q)), t),
    'coordinate_plane': lambda p, t, q: _upload(_generate_image(_create_prompt('coordinate_plane', p, q)), t),
    'bar_chart':        lambda p, t, q: _upload(_generate_image(_create_prompt('bar_chart', p, q)), t),
    '3d_shape':         lambda p, t, q: _upload(_generate_image(_create_prompt('3d_shape', p, q)), t),
    'trapezoid':        lambda p, t, q: _upload(_generate_image(_create_prompt('trapezoid', p, q)), t),
    'function_graph':   lambda p, t, q: _upload(_generate_image(_create_prompt('function_graph', p, q)), t),
    'clock':            lambda p, t, q: _upload(_generate_image(_create_prompt('clock', p, q)), t),
    'scale':            lambda p, t, q: _upload(_generate_image(_create_prompt('scale', p, q)), t),
    'venn_diagram':     lambda p, t, q: _upload(_generate_image(_create_prompt('venn_diagram', p, q)), t),
    'pie_chart':        lambda p, t, q: _upload(_generate_image(_create_prompt('pie_chart', p, q)), t),
    'factor_tree':      lambda p, t, q: _upload(_generate_image(_create_prompt('factor_tree', p, q)), t),
    'matrix':           lambda p, t, q: _upload(_generate_image(_create_prompt('matrix', p, q)), t),
    'ruler':            lambda p, t, q: _upload(_generate_image(_create_prompt('ruler', p, q)), t),
    'money':            lambda p, t, q: _upload(_generate_image(_create_prompt('money', p, q)), t),
    'tree_diagram':     lambda p, t, q: _upload(_generate_image(_create_prompt('tree_diagram', p, q)), t),
    'number_grid':      lambda p, t, q: _upload(_generate_image(_create_prompt('number_grid', p, q)), t),
    'custom':           lambda p, t, q: _upload(_generate_image(p.get('prompt', '')), t),
}


def delete_from_s3(image_url: str) -> bool:
    """Delete an image from S3 given its full URL. Returns True if successful."""
    if not image_url:
        return False
    try:
        base = CDN_BASE.rstrip('/') or f"https://{BUCKET}.s3.amazonaws.com"
        if image_url.startswith(base):
            key = image_url[len(base):].lstrip('/')
        else:
            key = image_url.split(BUCKET)[-1].lstrip('/')
        _get_s3().delete_object(Bucket=BUCKET, Key=key)
        print(f"[image_service] Deleted S3 object: {key}")
        return True
    except Exception as e:
        print(f"[image_service] S3 delete failed for {image_url}: {e}")
        return False


MAX_IMAGE_RETRIES = 2

def generate(image_type: str, params: dict, topic: str = "general", question: str = "") -> str | None:
    """Generate a math diagram image via OpenRouter, verify with Claude Vision, retry if wrong, then upload to S3."""
    if image_type not in _GENERATORS:
        return None

    base_prompt = _create_prompt(image_type, params, question) if image_type != 'custom' else params.get('prompt', '')
    prompt = base_prompt

    for attempt in range(1, MAX_IMAGE_RETRIES + 2):  # 1 initial + MAX_IMAGE_RETRIES retries
        try:
            print(f"[image_service] generate attempt {attempt} | type={image_type}")
            image_bytes = _generate_image(prompt)
            if not image_bytes:
                return None

            is_valid, feedback = _verify_image(image_bytes, image_type, params, question)
            if is_valid:
                return _upload(image_bytes, topic)

            if attempt <= MAX_IMAGE_RETRIES:
                print(f"[image_service] attempt {attempt} failed — retrying with feedback: {feedback}")
                prompt = base_prompt + f"\n\nPercobaan sebelumnya SALAH. Perbaiki masalah ini: {feedback}"
            else:
                print(f"[image_service] all {MAX_IMAGE_RETRIES + 1} attempts failed — discarding image")
                return None

        except Exception as e:
            print(f"[image_service] attempt {attempt} error: {e}")
            return None

    return None
