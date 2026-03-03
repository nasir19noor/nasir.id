'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/lib/auth'
import { submitAnswer, getSession, type Question, type Performance } from '@/lib/api'
import Navbar from '@/components/Navbar'
import AnswerOption from '@/components/AnswerOption'
import DifficultyBadge from '@/components/DifficultyBadge'
import ProgressBar from '@/components/ProgressBar'

interface HistoryEntry {
  question: string
  choices: string[]
  correct_answer: string
  user_answer: string
  is_correct: boolean
  explanation: string
  difficulty: string
  image_url: string | null
}

type AnswerState = 'idle' | 'selected' | 'correct' | 'wrong'

export default function ActiveQuizPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const router = useRouter()
  const { loading: authLoading } = useAuth()

  // Session meta
  const [totalQ, setTotalQ] = useState(10)
  const [topic, setTopic] = useState('')

  // Current question state
  const [question, setQuestion] = useState<Question | null>(null)
  const [answered, setAnswered] = useState(0)
  const [score, setScore] = useState(0)
  const [performance, setPerformance] = useState<Performance | null>(null)

  // Answer interaction
  const [selected, setSelected] = useState<string | null>(null)
  const [states, setStates] = useState<Record<string, AnswerState>>({})
  const [explanation, setExplanation] = useState('')
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Timer (per question)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // History (for result page)
  const historyRef = useRef<HistoryEntry[]>([])

  // ── Init: load first question from sessionStorage (set by setup page) ──────
  useEffect(() => {
    if (authLoading) return
    const raw = sessionStorage.getItem(`quiz_init_${sessionId}`)
    if (raw) {
      const init = JSON.parse(raw) as {
        first_question: Question
        total_questions: number
        topic: string
      }
      setQuestion(init.first_question)
      setTotalQ(init.total_questions)
      setTopic(init.topic)
      sessionStorage.removeItem(`quiz_init_${sessionId}`)
    } else {
      // Fallback: fetch session meta; first question is already gone so redirect
      getSession(Number(sessionId)).then((s) => {
        setTotalQ(s.total_questions)
        setTopic(s.topic)
        if (s.completed) {
          router.replace(`/quiz/${sessionId}/result`)
        }
      }).catch(() => router.replace('/dashboard'))
    }
  }, [authLoading, sessionId, router])

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!question) return
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [question])

  // ── Answer ────────────────────────────────────────────────────────────────
  function handleSelect(letter: string) {
    if (submitting || !question) return
    if (!selected && timerRef.current) clearInterval(timerRef.current)
    setSelected(letter)
  }

  async function handleSubmit() {
    if (!selected || submitting || !question) return
    setSubmitting(true)

    try {
      const res = await submitAnswer({
        question_id: question.id,
        session_id: Number(sessionId),
        user_answer: selected,
        time_seconds: elapsed,
      })

      // Build states map: mark selected green/red
      const newStates: Record<string, AnswerState> = {}
      question.choices.forEach((_, i) => {
        const l = String.fromCharCode(65 + i)
        newStates[l] = 'idle'
      })
      newStates[selected] = res.is_correct ? 'correct' : 'wrong'

      setStates(newStates)
      setIsCorrect(res.is_correct)
      setExplanation(res.explanation)
      setScore(res.session_score)
      setPerformance(res.performance)

      historyRef.current.push({
        question: question.question,
        choices: question.choices,
        correct_answer: selected,
        user_answer: selected,
        is_correct: res.is_correct,
        explanation: res.explanation,
        difficulty: question.difficulty,
        image_url: question.image_url,
      })

      const nextAnswered = answered + 1

      // Wait 1.8s then advance
      setTimeout(() => {
        setSelected(null)
        setStates({})
        setExplanation('')
        setIsCorrect(null)
        setSubmitting(false)
        setAnswered(nextAnswered)

        if (res.next_question) {
          setQuestion(res.next_question)
        } else {
          // Session complete
          sessionStorage.setItem(
            `quiz_result_${sessionId}`,
            JSON.stringify({
              history: historyRef.current,
              score: res.session_score,
              total: totalQ,
              topic,
              performance: res.performance,
            })
          )
          router.push(`/quiz/${sessionId}/result`)
        }
      }, 1800)
    } catch {
      setSubmitting(false)
      setSelected(null)
    }
  }

  if (authLoading || !question) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Memuat soal...</p>
      </div>
    )
  }

  const letters = question.choices.map((_, i) => String.fromCharCode(65 + i))

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* Header: progress + meta */}
        <div className="mb-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold text-gray-700 capitalize">{topic}</span>
            <span>⏱ {elapsed}s</span>
          </div>
          <ProgressBar current={answered + 1} total={totalQ} />
          <div className="flex items-center justify-between mt-1">
            <DifficultyBadge difficulty={question.difficulty} />
            <span className="text-xs text-gray-500">Skor: <span className="font-bold text-primary-600">{score}</span></span>
          </div>
        </div>

        {/* Question card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-5">
          <p className="text-base font-semibold text-gray-800 leading-relaxed mb-4">
            {question.question}
          </p>

          {question.image_url && (
            <div className="relative w-full h-48 mb-4 rounded-xl overflow-hidden bg-gray-100">
              <Image
                src={question.image_url}
                alt="Diagram soal"
                fill
                className="object-contain"
              />
            </div>
          )}

          <div className="space-y-2.5">
            {question.choices.map((choice, i) => {
              const letter = letters[i]
              const state = states[letter] ?? (selected === letter ? 'selected' : 'idle')
              return (
                <AnswerOption
                  key={letter}
                  label={choice}
                  state={state}
                  disabled={submitting}
                  onClick={() => handleSelect(letter)}
                />
              )
            })}
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!selected || submitting}
            className="mt-4 w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors text-sm"
          >
            {submitting ? 'Memeriksa...' : 'Jawab'}
          </button>
        </div>

        {/* Feedback banner */}
        {isCorrect !== null && (
          <div className={`rounded-xl p-4 border ${isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
            <p className={`font-bold text-sm mb-1 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect ? '✅ Benar!' : '❌ Salah!'}
            </p>
            <p className="text-sm text-gray-700">{explanation}</p>
            {performance && (
              <p className="text-xs text-gray-400 mt-2">
                Akurasi sesi: {Math.round(performance.accuracy * 100)}% · Kesulitan berikutnya:{' '}
                <span className="font-medium">{
                  performance.next_difficulty === 'easy' ? 'Mudah' :
                  performance.next_difficulty === 'medium' ? 'Sedang' : 'Sulit'
                }</span>
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
