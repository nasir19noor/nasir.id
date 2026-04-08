'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { getUserStats, UserStats } from '@/lib/api'
import Navbar from '@/components/Navbar'

// ── SVG donut chart ────────────────────────────────────────────────
function AccuracyRing({ accuracy }: { accuracy: number }) {
  const r    = 38
  const circ = 2 * Math.PI * r
  const pct  = Math.round(accuracy * 100)
  const offset = circ - (pct / 100) * circ
  const color  = pct >= 80 ? '#059669' : pct >= 60 ? '#eab308' : pct >= 40 ? '#f97316' : '#ef4444'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <span className="absolute text-lg font-bold text-gray-800">{pct}%</span>
    </div>
  )
}

// ── Skill level helpers ────────────────────────────────────────────
const SKILL_CONFIG = {
  pemula:     { label: 'Pemula',     color: 'bg-red-100 text-red-700',       bar: 'bg-red-400' },
  berkembang: { label: 'Berkembang', color: 'bg-orange-100 text-orange-700', bar: 'bg-orange-400' },
  mahir:      { label: 'Mahir',      color: 'bg-yellow-100 text-yellow-700', bar: 'bg-yellow-400' },
  ahli:       { label: 'Ahli',       color: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
} as const

function SkillBadge({ level }: { level: keyof typeof SKILL_CONFIG }) {
  const cfg = SKILL_CONFIG[level]
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function TopicSkillRow({ topic, accuracy, skill_level, questions, correct }:
  { topic: string; accuracy: number; skill_level: keyof typeof SKILL_CONFIG; questions: number; correct: number }) {
  const pct = Math.round(accuracy * 100)
  const bar = SKILL_CONFIG[skill_level].bar
  return (
    <div className="flex items-center gap-3">
      <p className="capitalize text-sm text-gray-700 w-40 shrink-0 truncate">{topic}</p>
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${bar} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 w-8 text-right">{pct}%</p>
      <SkillBadge level={skill_level} />
      <p className="text-xs text-gray-400 w-14 text-right shrink-0">{correct}/{questions}</p>
    </div>
  )
}

export default function ProgressPage() {
  const router = useRouter()
  const { loading } = useAuth()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [statsTab, setStatsTab] = useState<'topik' | 'riwayat'>('topik')

  useEffect(() => {
    getUserStats().then(setStats).catch(() => {})
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Memuat...</p>
      </div>
    )
  }

  const hasStats = stats && stats.total_questions > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">

        <button onClick={() => router.push('/dashboard')} className="text-sm text-primary-600 hover:underline flex items-center gap-1">
          ← Kembali ke Beranda
        </button>

        <h2 className="text-xl font-bold text-gray-800">📊 Perkembangan Belajar</h2>

        {!hasStats ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-gray-500 text-sm">Belum ada data. Mulai kuis pertamamu!</p>
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{stats.total_sessions}</p>
                <p className="text-xs text-gray-500 mt-1">Sesi</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{stats.total_questions}</p>
                <p className="text-xs text-gray-500 mt-1">Soal Dijawab</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">{stats.topics.length}</p>
                <p className="text-xs text-gray-500 mt-1">Topik Dipelajari</p>
              </div>
            </div>

            {/* Accuracy */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex items-center gap-6">
              <AccuracyRing accuracy={stats.overall_accuracy} />
              <div>
                <p className="font-semibold text-gray-800">Akurasi Keseluruhan</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {Math.round(stats.overall_accuracy * 100)}% jawaban benar dari {stats.total_questions} soal
                </p>
              </div>
            </div>

            {/* Tab detail */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
                {(['topik', 'riwayat'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStatsTab(tab)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      statsTab === tab ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === 'topik' ? 'Level per Topik' : 'Riwayat Sesi'}
                  </button>
                ))}
              </div>

              {statsTab === 'topik' && (
                <div className="space-y-3">
                  {stats.topics.map((t) => (
                    <TopicSkillRow key={t.topic} {...t} />
                  ))}
                </div>
              )}

              {statsTab === 'riwayat' && (
                <div className="space-y-2">
                  {stats.recent_sessions.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Belum ada riwayat.</p>
                  ) : (
                    stats.recent_sessions.map((s) => {
                      const pct = Math.round((s.score / s.total) * 100)
                      return (
                        <div key={s.session_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800 capitalize">{s.topic}</p>
                            {s.created_at && (
                              <p className="text-xs text-gray-400">
                                {new Date(s.created_at).toLocaleDateString('id-ID', {
                                  day: 'numeric', month: 'short', year: 'numeric',
                                })}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-800">
                              {s.score}<span className="text-gray-400 font-normal">/{s.total}</span>
                            </p>
                            <p className={`text-xs font-semibold ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>
                              {pct}%
                            </p>
                          </div>
                          <div className={`w-2 h-10 rounded-full ${pct >= 80 ? 'bg-emerald-400' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
