'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { getTopics, createSession, getApiKeys } from '@/lib/api'
import Navbar from '@/components/Navbar'

const topicEmoji: Record<string, string> = {
  penjumlahan:                '➕',
  pengurangan:                '➖',
  perkalian:                  '✖️',
  pembagian:                  '➗',
  ukuran:                     '📐',
  waktu:                      '⏰',
  berat:                      '⚖️',
  panjang:                    '📏',
  'perhitungan bangun datar': '🔷',
  'garis bilangan':           '📊',
  'nilai uang':               '💰',
  satuan:                     '🔢',
  'bilangan pecahan':         '½',
  'perhitungan besaran sudut':'📐',
  KPK:                        '🔁',
  FPB:                        '🔀',
  'bilangan bulat':           '🔢',
}

function QuizSetupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loading, user } = useAuth()

  const [topics, setTopics] = useState<string[]>([])
  const [topic, setTopic] = useState(searchParams.get('topic') ?? '')
  const [hasClaudeKey, setHasClaudeKey] = useState(false)
  const [hasGeminiKey, setHasGeminiKey] = useState(false)

  const hasAiAccess = user?.ai_access ?? false
  const canUseAi = hasAiAccess || hasClaudeKey || hasGeminiKey

  const [totalQuestions, setTotalQuestions] = useState(10)
  const [useAi, setUseAi] = useState(false)
  const [includeImages, setIncludeImages] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getTopics().then(setTopics).catch(() => {})
    getApiKeys().then((keys) => {
      setHasClaudeKey(keys.claude.has_key)
      setHasGeminiKey(keys.gemini.has_key)
    }).catch(() => {})
  }, [])

  async function handleStart() {
    if (!topic) { setError('Pilih topik terlebih dahulu.'); return }
    setError('')
    setSubmitting(true)
    try {
      const session = await createSession({
        topic,
        total_questions: totalQuestions,
        use_ai: useAi,
        include_images: includeImages,
        client: 'web',
      })
      // Pass first question to active quiz page via sessionStorage
      sessionStorage.setItem(`quiz_init_${session.session_id}`, JSON.stringify({
        first_question: session.first_question,
        total_questions: session.total_questions,
        topic: session.topic,
      }))
      router.push(`/quiz/${session.session_id}`)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? 'Gagal memulai kuis. Coba lagi.')
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-10">
        <button onClick={() => router.push('/dashboard')} className="text-sm text-primary-600 hover:underline mb-6 flex items-center gap-1">
          ← Kembali ke Beranda
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-800">⚙️ Pengaturan Kuis</h2>

          {/* Topic */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Topik
              {topic && (
                <span className="ml-2 text-primary-600 font-normal">— {topic}</span>
              )}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
              {topics.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-center transition-all text-xs font-semibold
                    ${topic === t
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50'
                    }`}
                >
                  <span className="text-lg">{topicEmoji[t] ?? '📚'}</span>
                  <span className="leading-tight capitalize">{t}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Total questions */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Jumlah Soal</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5} max={50} step={5}
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(Number(e.target.value))}
                className="flex-1 accent-primary-600"
              />
              <input
                type="number"
                min={1} max={100}
                value={totalQuestions}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(100, Number(e.target.value) || 1))
                  setTotalQuestions(v)
                }}
                className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center font-semibold text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Mode */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Mode Soal</p>
            <div className="grid grid-cols-2 gap-3">
              {canUseAi ? (
                <button
                  onClick={() => setUseAi(true)}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${useAi ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:border-primary-300'}`}
                >
                  <p className="font-semibold text-sm">🤖 AI Adaptif</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {hasGeminiKey ? 'Gemini (kunci Anda)' : hasClaudeKey ? 'Claude (kunci Anda)' : 'Soal disesuaikan otomatis'}
                  </p>
                </button>
              ) : (
                <div className="text-left p-3 rounded-xl border-2 border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed">
                  <p className="font-semibold text-sm text-gray-400">🤖 AI Adaptif</p>
                  <p className="text-xs text-gray-400 mt-0.5">Tambahkan API key di profil</p>
                </div>
              )}
              <button
                onClick={() => setUseAi(false)}
                className={`text-left p-3 rounded-xl border-2 transition-all ${!useAi ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:border-primary-300'}`}
              >
                <p className="font-semibold text-sm">📚 Bank Soal</p>
                <p className="text-xs text-gray-400 mt-0.5">Soal dari kumpulan latihan</p>
              </button>
            </div>
          </div>

          {/* Include images */}
          {useAi && (
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeImages}
                onChange={(e) => setIncludeImages(e.target.checked)}
                className="w-4 h-4 accent-primary-600"
              />
              <span className="text-sm text-gray-700">
                🖼️ Tampilkan gambar/diagram (untuk topik visual)
              </span>
            </label>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleStart}
            disabled={submitting}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 text-base"
          >
            {submitting ? 'Memulai...' : '🚀 Mulai Kuis'}
          </button>
        </div>
      </main>
    </div>
  )
}

export default function QuizSetupPage() {
  return (
    <Suspense>
      <QuizSetupForm />
    </Suspense>
  )
}
