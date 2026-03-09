import anthropic, json, os, re
from datetime import date
from typing import Optional
from sqlalchemy.orm import Session
from models import UserAnswer
from constants import VISUAL_TOPICS, STORY_TOPICS, SYMBOLIC_TOPICS

_system_claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

CLAUDE_MODEL      = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")
CLAUDE_MAX_TOKENS = int(os.getenv("CLAUDE_MAX_TOKENS", "1024"))

# ─── Difficulty Levels ─────────────────────────────────────────────

DIFFICULTY_LEVELS = ["sangat_mudah", "mudah", "sedang", "sulit", "sangat_sulit"]


def _normalize_difficulty(d: str) -> str:
    """Ensure difficulty is in valid 5-level standard."""
    if d in DIFFICULTY_LEVELS:
        return d
    # Default to 'sedang' if invalid value
    return "sedang"


def calculate_age(birth_date: date) -> int:
    today = date.today()
    age = today.year - birth_date.year
    if (today.month, today.day) < (birth_date.month, birth_date.day):
        age -= 1
    return age


def get_base_difficulty(age: Optional[int]) -> str:
    """Return the age-appropriate starting difficulty."""
    if age is None:
        return "sedang"
    if age <= 7:
        return "sangat_mudah"
    if age <= 9:
        return "mudah"
    if age <= 11:
        return "sedang"
    if age <= 14:
        return "sulit"
    return "sangat_sulit"


def _age_context(age: Optional[int]) -> str:
    """Return an age-appropriate prompt context string."""
    if age is None:
        return "Gunakan angka realistis untuk soal matematika umum."
    if age <= 7:
        return (f"Siswa berusia {age} tahun (kelas 1-2 SD). "
                "Gunakan angka sangat kecil (1-20), kalimat sangat sederhana, dan konteks kehidupan sehari-hari anak.")
    if age <= 9:
        return (f"Siswa berusia {age} tahun (kelas 3-4 SD). "
                "Gunakan angka kecil hingga sedang, kalimat mudah dipahami, dan soal konkret.")
    if age <= 11:
        return (f"Siswa berusia {age} tahun (kelas 5-6 SD). "
                "Gunakan angka realistis untuk kelas 5-6 SD, boleh melibatkan pecahan dan desimal sederhana.")
    if age <= 14:
        return (f"Siswa berusia {age} tahun (SMP). "
                "Soal boleh lebih kompleks, melibatkan aljabar dasar, persamaan sederhana, dan geometri.")
    return (f"Siswa berusia {age} tahun (SMA). "
            "Soal dapat mencakup konsep matematika tingkat lanjut seperti fungsi, trigonometri, dan statistika.")


def _adjust_difficulty(current: str, acc5: float) -> str:
    """Move one step up or down from current level based on last-5 accuracy."""
    idx = DIFFICULTY_LEVELS.index(_normalize_difficulty(current))
    if acc5 >= 0.8:
        idx = min(idx + 1, len(DIFFICULTY_LEVELS) - 1)
    elif acc5 <= 0.4:
        idx = max(idx - 1, 0)
    return DIFFICULTY_LEVELS[idx]


# ─── Core Functions ────────────────────────────────────────────────

def analyse_performance(user_id: int, session_id: int, db: Session,
                        age: Optional[int] = None) -> dict:
    answers = db.query(UserAnswer).filter(
        UserAnswer.user_id == user_id,
        UserAnswer.session_id == session_id
    ).order_by(UserAnswer.created_at).all()

    base = get_base_difficulty(age)

    if not answers:
        return {'total': 0, 'correct': 0, 'accuracy': 0.0,
                'weak_topics': [], 'strong_topics': [],
                'next_difficulty': base, 'recent_history': []}

    topic_stats: dict = {}
    for ans in answers:
        t = ans.topic
        if t not in topic_stats:
            topic_stats[t] = {'total': 0, 'correct': 0}
        topic_stats[t]['total'] += 1
        topic_stats[t]['correct'] += int(ans.is_correct)

    total    = len(answers)
    correct  = sum(1 for a in answers if a.is_correct)
    accuracy = correct / total

    weak_topics   = [t for t, s in topic_stats.items()
                     if s['total'] >= 2 and s['correct'] / s['total'] < 0.5]
    strong_topics = [t for t, s in topic_stats.items()
                     if s['correct'] / s['total'] >= 0.8]

    # Adjust from the last answered question's difficulty
    last_difficulty = _normalize_difficulty(answers[-1].difficulty or base)
    last5   = answers[-5:]
    acc5    = sum(1 for a in last5 if a.is_correct) / len(last5)
    next_diff = _adjust_difficulty(last_difficulty, acc5)

    return {
        'total': total, 'correct': correct,
        'accuracy': round(accuracy, 2),
        'weak_topics': weak_topics,
        'strong_topics': strong_topics,
        'next_difficulty': next_diff,
        'recent_history': [
            {'topic': a.topic, 'correct': a.is_correct,
             'difficulty': _normalize_difficulty(a.difficulty)}
            for a in answers[-10:]
        ]
    }


def generate_adaptive_question(topic: str, performance: dict,
                                include_image: bool = False,
                                claude_api_key: Optional[str] = None,
                                gemini_api_key: Optional[str] = None,
                                age: Optional[int] = None) -> dict:
    accuracy_pct = round(performance.get('accuracy', 0) * 100)
    weak         = performance.get('weak_topics', [])
    difficulty   = performance.get('next_difficulty', get_base_difficulty(age))
    history      = performance.get('recent_history', [])
    needs_image    = include_image and topic in VISUAL_TOPICS
    needs_story    = topic in STORY_TOPICS
    needs_symbolic = topic in SYMBOLIC_TOPICS

    # Map internal key to human-readable label for the prompt
    difficulty_labels = {
        "sangat_mudah": "Sangat Mudah",
        "mudah": "Mudah",
        "sedang": "Sedang",
        "sulit": "Sulit",
        "sangat_sulit": "Sangat Sulit",
    }
    difficulty_label = difficulty_labels.get(difficulty, difficulty)

    image_instruction = ""
    image_schema      = ""
    if needs_image:
        image_instruction = """
    - Sertakan field "image" HANYA jika gambar benar-benar membantu memvisualisasikan soal yang kamu buat (bukan hanya karena topiknya).
    - Jika soal yang kamu hasilkan tidak memerlukan gambar (misalnya soal cerita atau perhitungan murni), JANGAN sertakan field "image".
    - Jika gambar diperlukan, pilih tipe yang paling sesuai dengan ISI SOAL (bukan topiknya):
        number_line : {"type": "number_line", "params": {"start": 0, "end": 20, "marked": [7]}}
        rectangle   : {"type": "rectangle",   "params": {"width": 5, "height": 3}}
        square      : {"type": "square",       "params": {"side": 4}}
        triangle    : {"type": "triangle",     "params": {"points": [[0.5,0.5],[4.5,0.5],[2.5,4]]}}
        circle      : {"type": "circle",       "params": {"radius": 3}}
        angle       : {"type": "angle",        "params": {"degrees": 60}}
        fraction    : {"type": "fraction",     "params": {"numerator": 3, "denominator": 4}}
        custom      : {"type": "custom",       "params": {"prompt": "deskripsi detail ilustrasi yang relevan dengan soal, latar putih, gaya edukatif profesional, label Bahasa Indonesia"}}
    - Gunakan "custom" untuk ilustrasi kontekstual (grafik, tabel, diagram) yang sesuai konten soal secara spesifik."""
        image_schema = '\n        "image": {"type": "...", "params": {...}},  // opsional, hanya jika benar-benar membantu'

    story_hint    = "\n    - Sajikan sebagai soal cerita kontekstual (gunakan situasi nyata, bukan abstrak)." if needs_story else ""
    symbolic_hint = "\n    - Fokus pada manipulasi aljabar/ekspresi simbolik; sertakan langkah penyelesaian singkat di penjelasan." if needs_symbolic else ""

    prompt = f"""Kamu adalah guru matematika. Buat SATU soal matematika dalam Bahasa Indonesia.

PROFIL: {_age_context(age)}
TOPIK: {topic}
TINGKAT KESULITAN: {difficulty_label}

ATURAN:
- Soal harus sesuai tingkat kesulitan dan usia siswa
- Tulis dalam Bahasa Indonesia{story_hint}{symbolic_hint}{image_instruction}
- Penjelasan: tulis langkah-langkah penyelesaian singkat, pisahkan setiap langkah dengan "\n" (contoh: "Langkah 1: ...\nLangkah 2: ...\nJadi jawabannya ...")

Balas HANYA dengan JSON ini (tanpa markdown, tanpa teks lain):
{{
{image_schema}    "soal": "teks soal",
    "pilihan": ["A. opsi1", "B. opsi2", "C. opsi3", "D. opsi4"],
    "jawaban_benar": "A",
    "penjelasan": "penjelasan singkat",
    "difficulty": "{difficulty}"
}}
"""

    if gemini_api_key:
        import google.generativeai as genai
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        raw = response.text.strip()
    else:
        client = anthropic.Anthropic(api_key=claude_api_key) if claude_api_key else _system_claude
        msg = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=CLAUDE_MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = msg.content[0].text.strip()

    # Strip markdown code fences if AI wrapped the JSON
    if raw.startswith("```"):
        parts = raw.split("```")
        if len(parts) >= 3:
            raw = parts[1]
            if raw.startswith("json\n"):
                raw = raw[5:]
        elif len(parts) == 2:
            raw = parts[1]
    
    # Find and extract only the JSON object (in case AI adds extra text)
    try:
        result = json.loads(raw)
    except json.JSONDecodeError as e:
        # Try to find JSON object within the response
        json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', raw, re.DOTALL)
        if json_match:
            json_str = json_match.group()
            try:
                result = json.loads(json_str)
            except json.JSONDecodeError:
                # Last attempt: try to fix incomplete JSON by adding missing closing quotes/braces
                try:
                    json_str = json_str + '" }' if not json_str.rstrip().endswith('}') else json_str
                    result = json.loads(json_str)
                except:
                    print(f"[adaptive] Failed to parse JSON: {e}")
                    print(f"[adaptive] Raw response length: {len(raw)}")
                    print(f"[adaptive] Raw response (first 1000 chars): {raw[:1000]}")
                    print(f"[adaptive] Raw response (last 200 chars): {raw[-200:]}")
                    raise
        else:
            print(f"[adaptive] Failed to parse JSON: {e}")
            print(f"[adaptive] Raw response length: {len(raw)}")
            print(f"[adaptive] Raw response (first 1000 chars): {raw[:1000]}")
            print(f"[adaptive] Raw response (last 200 chars): {raw[-200:]}")
            raise

    if needs_image and 'image' in result:
        from services.image_service import generate as gen_image
        img      = result.pop('image')
        img_url  = gen_image(img.get('type', ''), img.get('params', {}), topic=topic)
        result['image_url'] = img_url
    
    # Ensure all required fields exist
    required_fields = ['soal', 'pilihan', 'jawaban_benar', 'penjelasan', 'difficulty']
    for field in required_fields:
        if field not in result:
            print(f"[adaptive] Missing required field: {field}")
            print(f"[adaptive] Response keys: {list(result.keys())}")
            result[field] = result.get(field, "")

    return result
