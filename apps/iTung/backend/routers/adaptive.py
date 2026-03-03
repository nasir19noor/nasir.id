import anthropic, json, os
from typing import Optional
from sqlalchemy.orm import Session
from models import UserAnswer
from constants import VISUAL_TOPICS

_system_claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def analyse_performance(user_id: int, session_id: int, db: Session) -> dict:
    answers = db.query(UserAnswer).filter(
        UserAnswer.user_id == user_id,
        UserAnswer.session_id == session_id
    ).order_by(UserAnswer.created_at).all()

    if not answers:
        return {'total': 0, 'correct': 0, 'accuracy': 0.0,
                'weak_topics': [], 'strong_topics': [],
                'next_difficulty': 'easy', 'recent_history': []}

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

    last5 = answers[-5:]
    acc5  = sum(1 for a in last5 if a.is_correct) / len(last5)
    if   acc5 >= 0.8: difficulty = 'hard'
    elif acc5 <= 0.4: difficulty = 'easy'
    else:             difficulty = 'medium'

    return {
        'total': total, 'correct': correct,
        'accuracy': round(accuracy, 2),
        'weak_topics': weak_topics,
        'strong_topics': strong_topics,
        'next_difficulty': difficulty,
        'recent_history': [
            {'topic': a.topic, 'correct': a.is_correct, 'difficulty': a.difficulty}
            for a in answers[-10:]
        ]
    }


def generate_adaptive_question(topic: str, performance: dict,
                                include_image: bool = False,
                                claude_api_key: Optional[str] = None,
                                gemini_api_key: Optional[str] = None) -> dict:
    accuracy_pct = round(performance.get('accuracy', 0) * 100)
    weak         = performance.get('weak_topics', [])
    difficulty   = performance.get('next_difficulty', 'medium')
    history      = performance.get('recent_history', [])
    needs_image  = include_image and topic in VISUAL_TOPICS

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

    prompt = f"""
    Kamu adalah guru matematika untuk siswa kelas 6 SD Indonesia. Buat SATU soal matematika.
    Semua teks harus dalam Bahasa Indonesia.

    PERFORMA SISWA:
    - Akurasi keseluruhan : {accuracy_pct}%
    - Topik lemah         : {weak}
    - Target kesulitan    : {difficulty}
    - 10 jawaban terakhir : {history}

    ATURAN:
    - Topik   : {topic}
    - Tingkat kesulitan harus: {difficulty}
    - Gunakan angka realistis untuk kelas 6 SD
    - Tulis soal, pilihan, dan penjelasan dalam Bahasa Indonesia{image_instruction}

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
    # Strip markdown code fences if Claude wrapped the JSON
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]          # drop opening fence + lang tag
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rsplit("```", 1)[0].strip()
    result = json.loads(raw)

    if needs_image and 'image' in result:
        from services.image_service import generate as gen_image
        img      = result.pop('image')
        img_url  = gen_image(img.get('type', ''), img.get('params', {}))
        result['image_url'] = img_url

    return result
