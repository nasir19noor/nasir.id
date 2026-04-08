'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import DifficultyBadge from '@/components/DifficultyBadge'

interface HistoryEntry {
  question: string
  choices: string[]
  user_answer: string
  is_correct: boolean
  explanation: string
  difficulty: string
  image_url: string | null
}

interface ResultData {
  history: HistoryEntry[]
  score: number
  total: number
  topic: string
  performance: {
    accuracy: number
    weak_topics: string[]
    strong_topics: string[]
  }
}

export default function ResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const router = useRouter()
  const { loading: authLoading } = useAuth()
  const [data, setData] = useState<ResultData | null>(null)

  useEffect(() => {
    if (authLoading) return
    const raw = sessionStorage.getItem(`quiz_result_${sessionId}`)
    if (raw) {
      setData(JSON.parse(raw) as ResultData)
      sessionStorage.removeItem(`quiz_result_${sessionId}`)
    } else {
      router.replace('/dashboard')
    }
  }, [authLoading, sessionId, router])

  if (authLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Memuat hasil...</p>
      </div>
    )
  }

  const pct = Math.round((data.score / data.total) * 100)
  const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '💪'
  const label = pct >= 80 ? 'Luar biasa!' : pct >= 60 ? 'Bagus!' : 'Terus berlatih!'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Score card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
          <span className="text-5xl">{emoji}</span>
          <h2 className="text-xl font-bold text-gray-800 mt-2">{label}</h2>
          <p className="text-sm text-gray-500 capitalize mt-1">Topik: {data.topic}</p>

          <div className="mt-5 flex justify-center gap-8">
            <div>
              <p className="text-3xl font-bold text-primary-600">{data.score}<span className="text-lg text-gray-400">/{data.total}</span></p>
              <p className="text-xs text-gray-500 mt-0.5">Skor</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-500">{pct}%</p>
              <p className="text-xs text-gray-500 mt-0.5">Akurasi</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-primary-500' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Weak/strong topics */}
          {(data.performance.weak_topics.length > 0 || data.performance.strong_topics.length > 0) && (
            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              {data.performance.strong_topics.length > 0 && (
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-green-700 mb-1">💪 Kuat di:</p>
                  {data.performance.strong_topics.map((t) => (
                    <p key={t} className="text-xs text-green-600 capitalize">{t}</p>
                  ))}
                </div>
              )}
              {data.performance.weak_topics.length > 0 && (
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">📖 Perlu latihan:</p>
                  {data.performance.weak_topics.map((t) => (
                    <p key={t} className="text-xs text-red-600 capitalize">{t}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push(`/quiz/setup?topic=${encodeURIComponent(data.topic)}`)}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            🔁 Ulangi Topik
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-white border border-gray-300 hover:border-primary-400 text-gray-700 font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            🏠 Beranda
          </button>
        </div>

        {/* Answer review */}
        <div>
          <h3 className="text-base font-bold text-gray-800 mb-3">📋 Review Jawaban</h3>
          <div className="space-y-3">
            {data.history.map((entry, i) => (
              <div
                key={i}
                className={`bg-white rounded-xl border p-4 ${entry.is_correct ? 'border-green-200' : 'border-red-200'}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-gray-800 flex-1">
                    <span className="text-gray-400 mr-1">#{i + 1}</span>
                    {entry.question}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span>{entry.is_correct ? '✅' : '❌'}</span>
                    <DifficultyBadge difficulty={entry.difficulty} />
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-2">
                  Jawabanmu:{' '}
                  <span className={`font-semibold ${entry.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                    {entry.choices.find((c) => c.startsWith(entry.user_answer)) ?? entry.user_answer}
                  </span>
                </p>

                <p className="text-xs text-gray-600 italic border-t border-gray-100 pt-2">
                  💡 {entry.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
