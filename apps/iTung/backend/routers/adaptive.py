import anthropic, json, os
from datetime import date
from typing import Optional
from sqlalchemy.orm import Session
from models import UserAnswer
from constants import VISUAL_TOPICS, STORY_TOPICS, SYMBOLIC_TOPICS

_system_claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# ─── Difficulty Levels ─────────────────────────────────────────────

DIFFICULTY_LEVELS = ["sangat_mudah", "mudah", "sedang", "sulit", "sangat_sulit"]

# Map old 3-level values to new 5-level values (backward compatibility)
_LEGACY_MAP = {"easy": "mudah", "medium": "sedang", "hard": "sulit"}


def _normalize_difficulty(d: str) -> str:
    return _LEGACY_MAP.get(d, d) if d not in DIFFICULTY_LEVELS else d


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
    - Include an "image" field describing the diagram to render. Use one of these types:
        number_line : {"type": "number_line", "params": {"start": 0, "end": 20, "marked": [7]}}
        rectangle   : {"type": "rectangle",   "params": {"width": 5, "height": 3}}
        square      : {"type": "square",       "params": {"side": 4}}
        triangle    : {"type": "triangle",     "params": {"points": [[0.5,0.5],[4.5,0.5],[2.5,4]]}}
        circle      : {"type": "circle",       "params": {"radius": 3}}
        angle       : {"type": "angle",        "params": {"degrees": 60}}
        fraction    : {"type": "fraction",     "params": {"numerator": 3, "denominator": 4}}
    - Choose the type that best matches the question."""
        image_schema = '\n        "image": {"type": "...", "params": {...}},'

    story_hint    = "\n    - Sajikan sebagai soal cerita kontekstual (gunakan situasi nyata, bukan abstrak)." if needs_story else ""
    symbolic_hint = "\n    - Fokus pada manipulasi aljabar/ekspresi simbolik; sertakan langkah penyelesaian singkat di penjelasan." if needs_symbolic else ""

    prompt = f"""
    Kamu adalah guru matematika. Buat SATU soal matematika dalam Bahasa Indonesia.

    PROFIL SISWA:
    - {_age_context(age)}
    - Akurasi keseluruhan : {accuracy_pct}%
    - Topik lemah         : {weak}
    - Target kesulitan    : {difficulty_label}
    - 10 jawaban terakhir : {history}

    ATURAN:
    - Topik   : {topic}
    - Tingkat kesulitan HARUS: {difficulty_label}
    - Sesuaikan kompleksitas angka dan kalimat dengan usia/tingkat siswa di atas
    - Tulis soal, pilihan, dan penjelasan dalam Bahasa Indonesia{story_hint}{symbolic_hint}{image_instruction}

    Balas HANYA dengan JSON ini (tanpa teks lain):
    {{{image_schema}
        "soal": "teks soal dalam Bahasa Indonesia",
        "pilihan": ["A. ...", "B. ...", "C. ...", "D. ..."],
        "jawaban_benar": "A",
        "penjelasan": "penjelasan singkat dalam Bahasa Indonesia",
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
            model='claude-opus-4-6',
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = msg.content[0].text.strip()

    # Strip markdown code fences if AI wrapped the JSON
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rsplit("```", 1)[0].strip()
    result = json.loads(raw)

    if needs_image and 'image' in result:
        from services.image_service import generate as gen_image
        img      = result.pop('image')
        img_url  = gen_image(img.get('type', ''), img.get('params', {}), topic=topic)
        result['image_url'] = img_url

    return result
