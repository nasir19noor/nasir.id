import anthropic, json, os, re
from datetime import date
from typing import Optional
from sqlalchemy.orm import Session
from models import UserAnswer
from constants import VISUAL_TOPICS, STORY_TOPICS, SYMBOLIC_TOPICS
from services import question_generator

_system_claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

CLAUDE_MODEL      = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")
CLAUDE_MAX_TOKENS = int(os.getenv("CLAUDE_MAX_TOKENS", "2048"))

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


# ─── Explanation Verifier ──────────────────────────────────────────

def _verify_penjelasan(soal: str, pilihan: list, jawaban_benar: str, penjelasan: str) -> str:
    """Call Claude to verify and, if wrong, rewrite the explanation."""
    verify_prompt = f"""Kamu adalah guru matematika yang memeriksa kebenaran penjelasan soal.

Soal: {soal}
Pilihan: {', '.join(pilihan)}
Jawaban benar: {jawaban_benar}
Penjelasan: {penjelasan}

Tugasmu:
1. Periksa apakah penjelasan di atas BENAR secara matematis dan sesuai jawaban benar.
2. Jika penjelasan sudah benar, balas HANYA dengan teks penjelasan aslinya (tidak diubah).
3. Jika penjelasan salah atau menyesatkan, balas HANYA dengan penjelasan yang sudah diperbaiki.

Balas HANYA dengan teks penjelasan (tanpa label, tanpa awalan apapun)."""

    try:
        msg = _system_claude.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": verify_prompt}]
        )
        verified = msg.content[0].text.strip()
        if verified:
            print(f"[adaptive] penjelasan verified/corrected")
            return verified
    except Exception as e:
        print(f"[adaptive] penjelasan verification failed: {e}")

    return penjelasan  # fallback to original if verifier fails


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


def _generate_penjelasan(soal: str, pilihan: list, jawaban_benar: str,
                         topic: str, claude_api_key: Optional[str] = None) -> str:
    """Ask Claude to write a step-by-step explanation for a given question."""
    client = anthropic.Anthropic(api_key=claude_api_key) if claude_api_key else _system_claude
    prompt = f"""Kamu adalah guru matematika. Tulis penjelasan langkah demi langkah dalam Bahasa Indonesia untuk soal berikut.

Topik: {topic}
Soal: {soal}
Pilihan: {', '.join(pilihan)}
Jawaban benar: {jawaban_benar}

Tulis penjelasan singkat yang menunjukkan cara menjawab soal ini.
Pisahkan setiap langkah dengan "\\n" (contoh: "Langkah 1: ...\\nLangkah 2: ...\\nJadi jawabannya ...").
Balas HANYA dengan teks penjelasan, tanpa label apapun."""
    try:
        msg = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}]
        )
        return msg.content[0].text.strip()
    except Exception as e:
        print(f"[adaptive] penjelasan generation failed: {e}")
        return ""


def _claude_image_metadata(soal: str, topic: str) -> Optional[dict]:
    """Ask Claude for the image type and params for a question. Returns {type, params} or None."""
    prompt = f"""Soal matematika berikut memerlukan diagram. Tentukan tipe diagram yang paling sesuai.

Soal: {soal}
Topik: {topic}

Pilih SATU tipe dari daftar ini HANYA jika gambar benar-benar membantu:
number_line, rectangle, square, triangle, circle, angle, fraction, coordinate_plane,
bar_chart, 3d_shape, trapezoid, function_graph, clock, scale, venn_diagram,
pie_chart, factor_tree, matrix, ruler, money, tree_diagram, number_grid

Jika tidak perlu gambar, balas: null

Jika perlu, balas HANYA JSON ini (tanpa markdown):
{{"type": "...", "params": {{...}}}}"""
    try:
        msg = _system_claude.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = msg.content[0].text.strip()
        if raw.lower() == "null" or not raw.startswith("{"):
            return None
        return json.loads(raw)
    except Exception as e:
        print(f"[adaptive] image metadata failed: {e}")
        return None


def generate_adaptive_question(topic: str, performance: dict,
                                include_image: bool = False,
                                claude_api_key: Optional[str] = None,
                                gemini_api_key: Optional[str] = None,
                                age: Optional[int] = None,
                                fixed_difficulty: Optional[str] = None) -> dict:
    # Determine difficulty
    difficulty = _normalize_difficulty(fixed_difficulty) if fixed_difficulty else \
                 performance.get("next_difficulty", get_base_difficulty(age))

    print(f"[adaptive] Generating | topic={topic} difficulty={difficulty} age={age}")

    # Step 1: Generate question with Python (zero AI tokens)
    result = question_generator.generate(topic, difficulty, age or 10)

    if result is None:
        print(f"[adaptive] No generator for topic={topic}")
        raise ValueError(f"Topic is not supported by the question generator")

    # Step 2: Generate penjelasan with Claude
    result["penjelasan"] = _generate_penjelasan(
        soal=result["soal"],
        pilihan=result["pilihan"],
        jawaban_benar=result["jawaban_benar"],
        topic=topic,
        claude_api_key=claude_api_key,
    )

    # Step 3: Verify penjelasan
    result["penjelasan"] = _verify_penjelasan(
        soal=result["soal"],
        pilihan=result["pilihan"],
        jawaban_benar=result["jawaban_benar"],
        penjelasan=result["penjelasan"],
    )

    # Step 4: Generate image if requested
    if include_image:
        img_meta = _claude_image_metadata(result["soal"], topic)
        if img_meta:
            from services.image_service import generate as gen_image
            img_url = gen_image(
                img_meta.get("type", ""),
                img_meta.get("params", {}),
                topic=topic,
                question=result["soal"],
            )
            result["image_url"] = img_url

    return result
