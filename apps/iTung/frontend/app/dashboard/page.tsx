'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { getTopics } from '@/lib/api'
import TopicCard from '@/components/TopicCard'
import Navbar from '@/components/Navbar'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [topics, setTopics] = useState<string[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    getTopics().then(setTopics).catch(() => {})
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Memuat...</p>
      </div>
    )
  }

  const filtered = topics.filter((t) =>
    t.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-primary-600 to-emerald-500 rounded-2xl p-6 text-white shadow">
          <p className="text-sm opacity-80">Selamat datang kembali,</p>
          <h2 className="text-2xl font-bold">{user?.full_name ?? user?.username} 👋</h2>
          <p className="text-sm opacity-80 mt-1">Pilih topik dan mulai latihan hari ini!</p>
        </div>

        {/* Topic grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Pilih Topik</h3>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari topik..."
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-40"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Topik tidak ditemukan.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {filtered.map((topic) => (
                <TopicCard
                  key={topic}
                  topic={topic}
                  onClick={() => router.push(`/quiz/setup?topic=${encodeURIComponent(topic)}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/progress"
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-primary-300 transition-all"
          >
            <span className="text-2xl">📊</span>
            <div>
              <p className="font-semibold text-sm text-gray-800">Perkembangan Belajar</p>
              <p className="text-xs text-gray-400">Lihat statistik &amp; riwayat</p>
            </div>
          </Link>
          <Link
            href="/profile"
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-primary-300 transition-all"
          >
            <span className="text-2xl">👤</span>
            <div>
              <p className="font-semibold text-sm text-gray-800">Profil Saya</p>
              <p className="text-xs text-gray-400">Lihat &amp; ubah profil</p>
            </div>
          </Link>
        </div>

      </main>
    </div>
  )
}
