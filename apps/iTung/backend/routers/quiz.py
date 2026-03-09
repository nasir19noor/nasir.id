from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
import anthropic as _anthropic
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
import threading

from database import get_db
from models import Question, UserAnswer, QuizSession, QuestionBank, User
from auth import decode_token, decrypt_key
from constants import TOPICS, TOPICS_BY_GRADE
from routers.adaptive import (analyse_performance, generate_adaptive_question,
                               calculate_age, get_base_difficulty, DIFFICULTY_LEVELS)

router   = APIRouter()
security = HTTPBearer()


# ─── Request schemas ──────────────────────────────────────────────

class CreateSessionRequest(BaseModel):
    topic: str
    total_questions: int = 3
    use_ai: bool = True
    include_images: bool = False
    client: str = "web"


class SubmitAnswerRequest(BaseModel):
    question_id: int
    session_id: int
    user_answer: str
    time_seconds: Optional[int] = None


# ─── Helpers ──────────────────────────────────────────────────────

def _question_dict(q: Question, number: int) -> dict:
    return {
        'id': q.id,
        'question': q.question_text,
        'choices': q.choices,
        'difficulty': q.difficulty,
        'image_url': q.image_url,
        'number': number,
    }


def _fetch_bank_question(session_id: int, topic: str, difficulty: str,
                          db: Session) -> Optional[QuestionBank]:
    """Pick a random bank question not yet asked in this session."""
    asked = (
        db.query(Question.bank_question_id)
        .filter(Question.session_id == session_id,
                Question.bank_question_id.isnot(None))
        .subquery()
    )
    return (
        db.query(QuestionBank)
        .filter(QuestionBank.topic == topic,
                QuestionBank.difficulty == difficulty,
                QuestionBank.is_active == True,
                ~QuestionBank.id.in_(asked))
        .order_by(func.random())
        .first()
    )


def _bank_question_to_model(bq: QuestionBank, session_id: int, user_id: int,
                              order_number: int) -> Question:
    return Question(
        session_id=session_id, user_id=user_id,
        bank_question_id=bq.id, topic=bq.topic,
        difficulty=bq.difficulty, question_text=bq.question_text,
        choices=bq.choices, correct_answer=bq.correct_answer,
        explanation=bq.explanation, image_url=bq.image_url,
        source='bank', order_number=order_number,
    )


def _save_to_bank(q: dict, topic: str, db: Session) -> QuestionBank:
    """Persist an AI-generated question into question_bank (skip duplicates)."""
    exists = db.query(QuestionBank).filter(
        QuestionBank.question_text == q['soal'],
        QuestionBank.topic == topic,
    ).first()
    if exists:
        return exists
    bq = QuestionBank(
        topic=topic, difficulty=q['difficulty'],
        question_text=q['soal'], choices=q['pilihan'],
        correct_answer=q['jawaban_benar'], explanation=q['penjelasan'],
        image_url=q.get('image_url'),
    )
    db.add(bq)
    db.flush()   # get bq.id without full commit
    return bq


def _next_bank_question(session_id: int, topic: str, difficulty: str,
                         db: Session) -> Optional[QuestionBank]:
    """Try preferred difficulty, then fall back outward through all 5 levels."""
    bq = _fetch_bank_question(session_id, topic, difficulty, db)
    if bq:
        return bq
    for d in DIFFICULTY_LEVELS:
        if d != difficulty:
            bq = _fetch_bank_question(session_id, topic, d, db)
            if bq:
                return bq
    return None


# ─── Background helpers ───────────────────────────────────────────

def _pregen_questions(session_id: int, user_id: int, topic: str,
                      total: int, start_order: int,
                      performance: dict, include_images: bool,
                      claude_api_key, gemini_api_key, age,
                      db_factory):
    """Pre-generate questions start_order..total in a background thread."""
    from database import SessionLocal
    db = db_factory()
    try:
        for order in range(start_order, total + 1):
            # Skip if already generated (e.g. race condition)
            exists = db.query(Question).filter(
                Question.session_id == session_id,
                Question.order_number == order,
            ).first()
            if exists:
                continue
            try:
                q = generate_adaptive_question(
                    topic, performance,
                    include_image=include_images,
                    claude_api_key=claude_api_key,
                    gemini_api_key=gemini_api_key,
                    age=age,
                )
                bq = _save_to_bank(q, topic, db)
                new_q = Question(
                    session_id=session_id, user_id=user_id,
                    bank_question_id=bq.id, topic=topic,
                    difficulty=q['difficulty'], question_text=q['soal'],
                    choices=q['pilihan'], correct_answer=q['jawaban_benar'],
                    explanation=q['penjelasan'], image_url=q.get('image_url'),
                    source='ai', order_number=order,
                )
                db.add(new_q)
                db.commit()
            except Exception as e:
                print(f"[pregen] Failed Q{order}: {e}")
    finally:
        db.close()


# ─── Endpoints ────────────────────────────────────────────────────

@router.post("/sessions")
def create_session(req: CreateSessionRequest,
                   background_tasks: BackgroundTasks,
                   creds=Depends(security),
                   db: Session = Depends(get_db)):
    if req.topic not in TOPICS:
        raise HTTPException(status_code=400,
                            detail=f"Invalid topic. Valid topics: {TOPICS}")

    token_data = decode_token(creds.credentials)
    user_id    = token_data.user_id

    db_user = db.query(User).filter(User.id == user_id).first()
    age = calculate_age(db_user.birth_date) if db_user and db_user.birth_date else None
    base_difficulty = get_base_difficulty(age)

    session = QuizSession(
        user_id=user_id, topic=req.topic,
        total_questions=req.total_questions,
        use_ai=req.use_ai, include_images=req.include_images,
        client=req.client,
    )
    db.add(session); db.commit(); db.refresh(session)

    performance = analyse_performance(user_id, session.id, db, age=age)

    if req.use_ai:
        user_claude = decrypt_key(db_user.claude_api_key) if db_user and db_user.claude_api_key else None
        user_gemini = decrypt_key(db_user.gemini_api_key) if db_user and db_user.gemini_api_key else None
        if not user_claude and not user_gemini and (not db_user or not db_user.ai_access):
            raise HTTPException(status_code=403,
                                detail="Akses AI belum diaktifkan. Hubungi admin atau tambahkan API key sendiri di profil.")
        try:
            q = generate_adaptive_question(req.topic, performance,
                                           include_image=req.include_images,
                                           claude_api_key=user_claude,
                                           gemini_api_key=user_gemini,
                                           age=age)
        except (_anthropic.RateLimitError, _anthropic.APIError) as e:
            raise HTTPException(status_code=503,
                                detail="Server AI sedang sibuk. Coba lagi dalam beberapa saat.")
        except Exception as e:
            raise HTTPException(status_code=502,
                                detail=f"Gagal menghasilkan soal AI: {str(e)}")
        bq = _save_to_bank(q, req.topic, db)
        new_q = Question(
            session_id=session.id, user_id=user_id,
            bank_question_id=bq.id,
            topic=req.topic, difficulty=q['difficulty'],
            question_text=q['soal'], choices=q['pilihan'],
            correct_answer=q['jawaban_benar'], explanation=q['penjelasan'],
            image_url=q.get('image_url'), source='ai', order_number=1,
        )
        # Pre-generate remaining questions in background
        if req.total_questions > 1:
            from database import SessionLocal
            threading.Thread(
                target=_pregen_questions,
                args=(session.id, user_id, req.topic,
                      req.total_questions, 2,
                      performance, req.include_images,
                      user_claude, user_gemini, age,
                      SessionLocal),
                daemon=True,
            ).start()
    else:
        bq = _next_bank_question(session.id, req.topic, base_difficulty, db)
        if not bq:
            raise HTTPException(status_code=404,
                                detail="No questions available in bank for this topic")
        new_q = _bank_question_to_model(bq, session.id, user_id, 1)

    db.add(new_q); db.commit(); db.refresh(new_q)
    return {
        'session_id': session.id,
        'topic': session.topic,
        'total_questions': session.total_questions,
        'use_ai': session.use_ai,
        'first_question': _question_dict(new_q, 1),
    }


@router.post("/submit-answer")
async def submit_answer(req: SubmitAnswerRequest,
                        creds=Depends(security),
                        db: Session = Depends(get_db)):
    token_data = decode_token(creds.credentials)
    user_id    = token_data.user_id

    question = db.query(Question).filter(Question.id == req.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    session = db.query(QuizSession).filter(QuizSession.id == req.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db_user = db.query(User).filter(User.id == user_id).first()
    age = calculate_age(db_user.birth_date) if db_user and db_user.birth_date else None

    is_correct = req.user_answer.upper() == question.correct_answer.upper()

    db.add(UserAnswer(
        question_id=req.question_id, session_id=req.session_id,
        user_id=user_id, topic=question.topic, difficulty=question.difficulty,
        user_answer=req.user_answer.upper(),
        is_correct=is_correct, time_seconds=req.time_seconds,
    ))
    if is_correct:
        session.score += 1
    db.commit()

    performance    = analyse_performance(user_id, req.session_id, db, age=age)
    answered_count = db.query(UserAnswer).filter(
        UserAnswer.session_id == req.session_id).count()

    next_question = None
    if answered_count < session.total_questions:
        order = answered_count + 1
        if session.use_ai:
            user_claude = decrypt_key(db_user.claude_api_key) if db_user and db_user.claude_api_key else None
            user_gemini = decrypt_key(db_user.gemini_api_key) if db_user and db_user.gemini_api_key else None
            # Check if next question was pre-generated
            new_q = db.query(Question).filter(
                Question.session_id == req.session_id,
                Question.order_number == order,
            ).first()
            if not new_q:
                # Not ready yet — generate synchronously as fallback
                try:
                    q = generate_adaptive_question(question.topic, performance,
                                                   include_image=session.include_images,
                                                   claude_api_key=user_claude,
                                                   gemini_api_key=user_gemini,
                                                   age=age)
                except (_anthropic.RateLimitError, _anthropic.APIError):
                    raise HTTPException(status_code=503,
                                        detail="Server AI sedang sibuk. Coba lagi dalam beberapa saat.")
                except Exception as e:
                    raise HTTPException(status_code=502,
                                        detail=f"Gagal menghasilkan soal AI: {str(e)}")
                bq = _save_to_bank(q, question.topic, db)
                new_q = Question(
                    session_id=req.session_id, user_id=user_id,
                    bank_question_id=bq.id,
                    topic=question.topic, difficulty=q['difficulty'],
                    question_text=q['soal'], choices=q['pilihan'],
                    correct_answer=q['jawaban_benar'], explanation=q['penjelasan'],
                    image_url=q.get('image_url'), source='ai', order_number=order,
                )
                db.add(new_q); db.commit(); db.refresh(new_q)
            # else: pre-generated new_q already in DB, no add needed
        else:
            difficulty = performance.get('next_difficulty', 'medium')
            bq = _next_bank_question(req.session_id, question.topic, difficulty, db)
            if not bq:
                session.completed = True; db.commit()
                return {
                    'is_correct': is_correct,
                    'explanation': question.explanation,
                    'session_score': session.score,
                    'next_question': None,
                    'performance': performance,
                }
            new_q = _bank_question_to_model(bq, req.session_id, user_id, order)
            db.add(new_q); db.commit(); db.refresh(new_q)
        next_question = _question_dict(new_q, order)
    else:
        session.completed = True
        db.commit()

    return {
        'is_correct': is_correct,
        'explanation': question.explanation,
        'session_score': session.score,
        'next_question': next_question,
        'performance': performance,
    }


@router.get("/topics")
def list_topics():
    return {'topics': TOPICS, 'topics_by_grade': TOPICS_BY_GRADE}


@router.get("/stats")
def get_stats(creds=Depends(security), db: Session = Depends(get_db)):
    token_data = decode_token(creds.credentials)
    user_id    = token_data.user_id

    answers  = db.query(UserAnswer).filter(UserAnswer.user_id == user_id).all()
    total_sessions = db.query(QuizSession).filter(
        QuizSession.user_id == user_id, QuizSession.completed == True
    ).count()
    recent_sessions = db.query(QuizSession).filter(
        QuizSession.user_id == user_id, QuizSession.completed == True
    ).order_by(QuizSession.created_at.desc()).limit(5).all()

    if not answers:
        return {
            'total_sessions': total_sessions,
            'total_questions': 0,
            'overall_accuracy': 0.0,
            'topics': [],
            'recent_sessions': [],
        }

    total   = len(answers)
    correct = sum(1 for a in answers if a.is_correct)

    topic_map: dict = {}
    for a in answers:
        if a.topic not in topic_map:
            topic_map[a.topic] = {'total': 0, 'correct': 0}
        topic_map[a.topic]['total']   += 1
        topic_map[a.topic]['correct'] += int(a.is_correct)

    def skill_level(acc: float) -> str:
        if acc >= 0.80: return 'ahli'
        if acc >= 0.60: return 'mahir'
        if acc >= 0.40: return 'berkembang'
        return 'pemula'

    topics = sorted([
        {
            'topic':       t,
            'questions':   s['total'],
            'correct':     s['correct'],
            'accuracy':    round(s['correct'] / s['total'], 2),
            'skill_level': skill_level(s['correct'] / s['total']),
        }
        for t, s in topic_map.items()
    ], key=lambda x: -x['questions'])

    recent = [
        {
            'session_id': s.id,
            'topic':      s.topic,
            'score':      s.score,
            'total':      s.total_questions,
            'created_at': s.created_at.isoformat() if s.created_at else None,
        }
        for s in recent_sessions
    ]

    return {
        'total_sessions':    total_sessions,
        'total_questions':   total,
        'overall_accuracy':  round(correct / total, 2),
        'topics':            topics,
        'recent_sessions':   recent,
    }


@router.get("/sessions/{session_id}")
def get_session(session_id: int,
                creds=Depends(security),
                db: Session = Depends(get_db)):
    token_data = decode_token(creds.credentials)
    session = db.query(QuizSession).filter(
        QuizSession.id == session_id,
        QuizSession.user_id == token_data.user_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        'id': session.id, 'topic': session.topic,
        'total_questions': session.total_questions,
        'score': session.score, 'completed': session.completed,
        'use_ai': session.use_ai,
    }
