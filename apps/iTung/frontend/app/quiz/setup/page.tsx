'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { getTopics, createSession, getApiKeys, TopicsByGrade, Grade } from '@/lib/api'
import Navbar from '@/components/Navbar'

const GRADES: Grade[] = ['Dasar', 'Menengah', 'Atas']

const topicEmoji: Record<string, string> = {
  'mengenal bilangan':                    '🔢',
  'penjumlahan dasar':                    '➕',
  'pengurangan dasar':                    '➖',
  'penjumlahan dan pengurangan dasar':    '🔄',
  'pengenalan perkalian':                 '✖️',
  'pengenalan pembagian':                 '➗',
  'perkalian':                            '✖️',
  'pembagian':                            '➗',
  'perkalian dan pembagian':              '🧮',
  'operasi hitung campuran':              '🧮',
  'bilangan bulat':                       '🔵',
  'bilangan romawi':                      '🏛️',
  'bilangan pecahan':                     '½',
  'bilangan desimal':                     '🔟',
  'persen':                               '💯',
  'KPK':                                  '🔁',
  'FPB':                                  '🔀',
  'faktor dan kelipatan':                 '🔢',
  'rasio dan proporsi':                   '⚖️',
  'nilai uang':                           '💰',
  'garis bilangan':                       '📊',
  'koordinat kartesius sederhana':        '📍',
  'skala dan denah':                      '🗺️',
  'pengenalan waktu':                     '🕐',
  'pengukuran waktu':                     '⏱️',
  'pengukuran panjang':                   '📏',
  'pengukuran berat':                     '⚖️',
  'satuan':                               '📐',
  'mengenal bangun datar':                '🔷',
  'keliling bangun datar':                '🔷',
  'luas persegi dan persegi panjang':     '⬜',
  'luas bangun datar':                    '🔷',
  'luas lingkaran':                       '⭕',
  'keliling lingkaran':                   '⭕',
  'sudut dan jenis sudut':                '📐',
  'volume kubus dan balok':               '📦',
  'volume prisma dan tabung':             '🧊',
  'sifat bangun ruang':                   '🎲',
  'mean median modus':                    '📊',
  'bilangan bulat lanjutan':              '🔢',
  'bilangan berpangkat':                  '📈',
  'bentuk akar':                          '√',
  'himpunan':                             '⊂',
  'aljabar dasar':                        '🔤',
  'persamaan linear satu variabel':       '➡️',
  'sistem persamaan linear dua variabel': '⚖️',
  'persamaan kuadrat':                    '📐',
  'fungsi kuadrat':                       '📈',
  'relasi dan fungsi':                    '↔️',
  'persamaan garis lurus':                '📏',
  'perbandingan senilai':                 '⚖️',
  'perbandingan berbalik nilai':          '🔄',
  'aritmatika sosial':                    '💼',
  'teorema pythagoras':                   '📐',
  'garis dan sudut':                      '📐',
  'segitiga':                             '🔺',
  'segiempat':                            '⬜',
  'lingkaran':                            '⭕',
  'kesebangunan dan kekongruenan':        '🔷',
  'bangun ruang sisi datar':              '📦',
  'bangun ruang sisi lengkung':           '⚽',
  'transformasi geometri':               '🔄',
  'statistika':                           '📊',
  'peluang':                              '🎲',
  'eksponen dan logaritma':               '📈',
  'sistem persamaan linear':              '⚖️',
  'pertidaksamaan linear':                '🔢',
  'fungsi':                               '📈',
  'komposisi fungsi':                     '🔗',
  'invers fungsi':                        '🔄',
  'trigonometri dasar':                   '📐',
  'aturan sinus dan kosinus':             '📐',
  'polinomial':                           '🔢',
  'limit fungsi':                         '∞',
  'turunan fungsi':                       '📉',
  'aplikasi turunan':                     '🔬',
  'integral tak tentu':                   '∫',
  'integral tentu':                       '∫',
  'aplikasi integral':                    '🔬',
  'matriks':                              '🔢',
  'determinan matriks':                   '🔢',
  'transformasi matriks':                 '🔄',
  'vektor 2D':                            '➡️',
  'vektor 3D':                            '🎯',
  'barisan aritmatika':                   '📊',
  'deret aritmatika':                     '∑',
  'barisan geometri':                     '📈',
  'deret geometri':                       '📈',
  'permutasi':                            '🔀',
  'kombinasi':                            '🎲',
  'peluang lanjutan':                     '🎲',
  'peluang distribusi binomial':          '📊',
  'geometri dimensi dua':                 '🔷',
  'geometri dimensi tiga':                '🧊',
  'geometri analitik lingkaran':          '⭕',
  'program linear':                       '📈',
  'statistika inferensial':               '📊',
}

function QuizSetupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loading, user } = useAuth()

  const [topicsByGrade, setTopicsByGrade] = useState<TopicsByGrade>({ Dasar: [], Menengah: [], Atas: [] })
  const [activeGrade, setActiveGrade] = useState<Grade>('Dasar')
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
    getTopics().then(({ topics_by_grade }) => {
      setTopicsByGrade(topics_by_grade)
      // auto-select grade tab if a topic was pre-selected via URL
      const pre = searchParams.get('topic')
      if (pre) {
        const matched = (Object.entries(topics_by_grade) as [Grade, string[]][])
          .find(([, list]) => list.includes(pre))
        if (matched) setActiveGrade(matched[0])
      }
    }).catch(() => {})
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
              {topic && <span className="ml-2 text-primary-600 font-normal">— {topic}</span>}
            </label>

            {/* Grade tabs */}
            <div className="flex gap-1 mb-2 bg-gray-100 p-1 rounded-xl">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setActiveGrade(g)}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeGrade === g ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {g}
                  <span className="ml-1 font-normal opacity-60">{topicsByGrade[g]?.length ?? 0}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
              {(topicsByGrade[activeGrade] ?? []).map((t) => (
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
