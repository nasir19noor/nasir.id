'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { adminGetUsers, adminUpdateUser, adminDeleteUser, User, adminGetAnalyticsSummary, adminGetAnalytics, AnalyticsSummary, UserAnalytics, adminGetQuestions, adminDeleteQuestion, QuestionBankItem, DIFFICULTY_LABELS } from '@/lib/api'
import Navbar from '@/components/Navbar'

function calcAge(birthDate: string): number {
  const today = new Date()
  const bd = new Date(birthDate)
  let age = today.getFullYear() - bd.getFullYear()
  if (today.getMonth() < bd.getMonth() ||
      (today.getMonth() === bd.getMonth() && today.getDate() < bd.getDate())) {
    age--
  }
  return age
}

function Toggle({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}
      title={label}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'}`}
      />
    </button>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const { user: me, loading } = useAuth()
  const [tab, setTab] = useState<'users' | 'analytics' | 'questions'>('users')
  const [users, setUsers] = useState<User[]>([])
  const [fetching, setFetching] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null)
  const [analytics, setAnalytics] = useState<UserAnalytics[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [questions, setQuestions] = useState<QuestionBankItem[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [confirmDeleteQuestion, setConfirmDeleteQuestion] = useState<number | null>(null)
  const [deletingQuestion, setDeletingQuestion] = useState<number | null>(null)

  useEffect(() => {
    if (loading) return
    if (!me?.is_admin) { router.replace('/dashboard'); return }
    adminGetUsers()
      .then(setUsers)
      .finally(() => setFetching(false))
  }, [loading, me, router])

  useEffect(() => {
    if (tab === 'analytics' && !analyticsSummary) {
      loadAnalytics()
    }
  }, [tab, analyticsSummary])

  useEffect(() => {
    if (tab === 'questions' && questions.length === 0) {
      loadQuestions()
    }
  }, [tab, questions.length])

  async function loadAnalytics() {
    setAnalyticsLoading(true)
    try {
      const [summary, recent] = await Promise.all([
        adminGetAnalyticsSummary(),
        adminGetAnalytics(0, 50)
      ])
      setAnalyticsSummary(summary)
      setAnalytics(recent)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  async function loadQuestions() {
    setQuestionsLoading(true)
    try {
      const data = await adminGetQuestions()
      setQuestions(data)
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      setQuestionsLoading(false)
    }
  }

  async function handleDeleteQuestion(questionId: number) {
    setDeletingQuestion(questionId)
    try {
      await adminDeleteQuestion(questionId)
      setQuestions((prev) => prev.filter((q) => q.id !== questionId))
    } catch (error) {
      console.error('Error deleting question:', error)
    } finally {
      setDeletingQuestion(null)
      setConfirmDeleteQuestion(null)
    }
  }

  async function handleDelete(userId: number) {
    setSaving(userId)
    try {
      await adminDeleteUser(userId)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } finally {
      setSaving(null)
      setConfirmDelete(null)
    }
  }

  async function toggle(userId: number, field: 'is_active' | 'is_admin' | 'ai_access', value: boolean) {
    setSaving(userId)
    try {
      const updated = await adminUpdateUser(userId, { [field]: value })
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
    } finally {
      setSaving(null)
    }
  }

  if (loading || (fetching && tab === 'users')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Memuat...</p>
      </div>
    )
  }

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total:     users.length,
    active:    users.filter((u) => u.is_active).length,
    aiAccess:  users.filter((u) => u.ai_access).length,
    admins:    users.filter((u) => u.is_admin).length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">⚙️ Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola pengguna, hak akses, dan analytics</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setTab('users')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              tab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            👥 Pengguna
          </button>
          <button
            onClick={() => setTab('analytics')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              tab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            📊 Analytics
          </button>
          <button
            onClick={() => setTab('questions')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              tab === 'questions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            ❓ Pertanyaan
          </button>
        </div>

        {/* Users Tab */}
        {tab === 'users' && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Pengguna', value: stats.total,    color: 'bg-blue-50 text-blue-700' },
                { label: 'Aktif',          value: stats.active,   color: 'bg-emerald-50 text-emerald-700' },
                { label: 'Akses AI',       value: stats.aiAccess, color: 'bg-purple-50 text-purple-700' },
                { label: 'Admin',          value: stats.admins,   color: 'bg-orange-50 text-orange-700' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-xl p-4 ${color}`}>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs mt-0.5 opacity-80">{label}</p>
                </div>
              ))}
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
                <h2 className="font-semibold text-gray-800">Daftar Pengguna</h2>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama / email..."
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">ID</th>
                      <th className="px-4 py-3 text-left">Pengguna</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-center">Aktif</th>
                      <th className="px-4 py-3 text-center">Akses AI</th>
                      <th className="px-4 py-3 text-center">Admin</th>
                      <th className="px-4 py-3 text-center">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-400">
                          Tidak ada pengguna ditemukan.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((u) => (
                        <tr
                          key={u.id}
                          className={`hover:bg-gray-50 transition-colors ${saving === u.id ? 'opacity-50' : ''}`}
                        >
                          <td className="px-4 py-3 text-gray-400">#{u.id}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">{u.full_name ?? u.username}</p>
                            {u.full_name && (
                              <p className="text-xs text-gray-400">@{u.username}</p>
                            )}
                            {u.birth_date && (
                              <p className="text-xs text-blue-500">{calcAge(u.birth_date)} tahun</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{u.email}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center">
                              <Toggle
                                checked={u.is_active}
                                onChange={(v) => toggle(u.id, 'is_active', v)}
                                label="Toggle aktif"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center">
                              <Toggle
                                checked={u.ai_access}
                                onChange={(v) => toggle(u.id, 'ai_access', v)}
                                label="Toggle akses AI"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center">
                              <Toggle
                                checked={u.is_admin}
                                onChange={(v) => u.id !== me?.id && toggle(u.id, 'is_admin', v)}
                                label={u.id === me?.id ? 'Tidak bisa mengubah diri sendiri' : 'Toggle admin'}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {u.id !== me?.id && (
                              confirmDelete === u.id ? (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleDelete(u.id)}
                                    className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg"
                                  >
                                    Ya
                                  </button>
                                  <button
                                    onClick={() => setConfirmDelete(null)}
                                    className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded-lg"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDelete(u.id)}
                                  className="text-xs text-red-500 hover:text-red-700 hover:underline"
                                >
                                  Hapus
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Analytics Tab */}
        {tab === 'analytics' && (
          <>
            {analyticsLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-gray-500">Memuat analytics...</p>
              </div>
            ) : analyticsSummary ? (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Requests', value: analyticsSummary.total_requests.toLocaleString(), color: 'bg-blue-50 text-blue-700', icon: '📈' },
                    { label: 'Unique IPs', value: analyticsSummary.unique_ips, color: 'bg-purple-50 text-purple-700', icon: '🌐' },
                    { label: 'Unique Users', value: analyticsSummary.unique_users, color: 'bg-green-50 text-green-700', icon: '👥' },
                    { label: 'Avg Response', value: `${Math.round(analyticsSummary.avg_response_time)}ms`, color: 'bg-orange-50 text-orange-700', icon: '⚡' },
                  ].map(({ label, value, color, icon }) => (
                    <div key={label} className={`rounded-xl p-4 ${color}`}>
                      <p className="text-2xl font-bold">{value}</p>
                      <p className="text-xs mt-0.5 opacity-80">{icon} {label}</p>
                    </div>
                  ))}
                </div>

                {/* Top Data */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Top Devices */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-800 mb-4">📱 Top Devices</h3>
                    <div className="space-y-2">
                      {analyticsSummary.top_devices.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.name || 'Other'}</span>
                          <span className="font-medium text-gray-800">{item.count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top OS */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-800 mb-4">💻 Top OS</h3>
                    <div className="space-y-2">
                      {analyticsSummary.top_os.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.name || 'Other'}</span>
                          <span className="font-medium text-gray-800">{item.count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Browsers */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-800 mb-4">🔗 Top Browsers</h3>
                    <div className="space-y-2">
                      {analyticsSummary.top_browsers.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.name || 'Other'}</span>
                          <span className="font-medium text-gray-800">{item.count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Sources */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-800 mb-4">🌍 Traffic Sources</h3>
                    <div className="space-y-2">
                      {analyticsSummary.top_sources.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.name || 'Direct'}</span>
                          <span className="font-medium text-gray-800">{item.count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Endpoints */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-800 mb-4">📍 Top Endpoints</h3>
                    <div className="space-y-2">
                      {analyticsSummary.top_endpoints.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600 truncate">{item.name || '/'}</span>
                          <span className="font-medium text-gray-800 flex-shrink-0 ml-2">{item.count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Countries */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-800 mb-4">🌏 Top Countries</h3>
                    <div className="space-y-2">
                      {analyticsSummary.top_countries.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.name || 'Unknown'}</span>
                          <span className="font-medium text-gray-800">{item.count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Cities */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-800 mb-4">🏙️ Top Cities</h3>
                    <div className="space-y-2">
                      {analyticsSummary.top_cities.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.name || 'Unknown'}</span>
                          <span className="font-medium text-gray-800">{item.count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Analytics */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-800">Recent Activity</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                          <th className="px-4 py-3 text-left">Time</th>
                          <th className="px-4 py-3 text-left">IP Address</th>
                          <th className="px-4 py-3 text-left">Location</th>
                          <th className="px-4 py-3 text-left">Device</th>
                          <th className="px-4 py-3 text-left">OS</th>
                          <th className="px-4 py-3 text-left">Browser</th>
                          <th className="px-4 py-3 text-left">Source</th>
                          <th className="px-4 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {analytics.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-8 text-gray-400">
                              Tidak ada analytics tersedia.
                            </td>
                          </tr>
                        ) : (
                          analytics.map((a) => (
                            <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-gray-600 text-xs">
                                {new Date(a.created_at).toLocaleString('id-ID', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </td>
                              <td className="px-4 py-3 text-gray-600 text-xs font-mono">{a.ip_address || '-'}</td>
                              <td className="px-4 py-3 text-gray-600 text-xs">
                                <div className="flex flex-col">
                                  <span>{a.country || 'Unknown'}</span>
                                  <span className="text-gray-400 text-xs">{a.city || '-'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-600 text-xs">{a.device || '-'}</td>
                              <td className="px-4 py-3 text-gray-600 text-xs">{a.os || '-'}</td>
                              <td className="px-4 py-3 text-gray-600 text-xs">{a.browser || '-'}</td>
                              <td className="px-4 py-3 text-gray-600 text-xs">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {a.source || 'direct'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-xs font-medium px-2 py-1 rounded ${
                                  a.status_code && a.status_code < 400 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {a.status_code || '-'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </>
        )}

        {/* Questions Tab */}
        {tab === 'questions' && (
          <>
            {questionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-gray-500">Memuat pertanyaan...</p>
              </div>
            ) : (
              <>
                {/* Summary */}
                {questions.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      {
                        label: 'Total Pertanyaan',
                        value: questions.length,
                        color: 'bg-blue-50 text-blue-700',
                      },
                      {
                        label: 'Aktif',
                        value: questions.filter((q) => q.is_active).length,
                        color: 'bg-emerald-50 text-emerald-700',
                      },
                      {
                        label: 'Topik Unik',
                        value: new Set(questions.map((q) => q.topic)).size,
                        color: 'bg-purple-50 text-purple-700',
                      },
                      {
                        label: 'Dengan Gambar',
                        value: questions.filter((q) => q.image_url).length,
                        color: 'bg-orange-50 text-orange-700',
                      },
                    ].map(({ label, value, color }) => (
                      <div key={label} className={`rounded-xl p-4 ${color}`}>
                        <p className="text-2xl font-bold">{value}</p>
                        <p className="text-xs mt-0.5 opacity-80">{label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Questions by Topic */}
                <div className="space-y-6">
                  {questions.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                      <p className="text-gray-500">Tidak ada pertanyaan ditemukan.</p>
                    </div>
                  ) : (
                    Object.entries(
                      questions.reduce(
                        (acc, q) => {
                          if (!acc[q.topic]) acc[q.topic] = []
                          acc[q.topic].push(q)
                          return acc
                        },
                        {} as Record<string, QuestionBankItem[]>
                      )
                    )
                      .sort(([topicA], [topicB]) => topicA.localeCompare(topicB))
                      .map(([topic, topicQuestions]) => (
                        <div
                          key={topic}
                          className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
                        >
                          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-gray-800 text-lg">📚 {topic}</h3>
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white text-gray-700 border border-gray-200">
                                {topicQuestions.length} soal
                              </span>
                            </div>
                          </div>

                          <div className="divide-y divide-gray-100">
                            {topicQuestions.map((q) => (
                              <div
                                key={q.id}
                                className={`p-4 hover:bg-gray-50 transition-colors ${
                                  deletingQuestion === q.id ? 'opacity-50' : ''
                                }`}
                              >
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-medium inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                          ID: {q.id}
                                        </span>
                                        <span
                                          className={`text-xs font-medium inline-flex items-center px-2 py-1 rounded-full ${
                                            q.difficulty === 'sangat_mudah'
                                              ? 'bg-green-100 text-green-700'
                                              : q.difficulty === 'mudah'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : q.difficulty === 'sedang'
                                                  ? 'bg-yellow-100 text-yellow-700'
                                                  : q.difficulty === 'sulit'
                                                    ? 'bg-orange-100 text-orange-700'
                                                    : 'bg-red-100 text-red-700'
                                          }`}
                                        >
                                          {DIFFICULTY_LABELS[q.difficulty]}
                                        </span>
                                        {!q.is_active && (
                                          <span className="text-xs font-medium inline-flex items-center px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                                            Tidak Aktif
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-700 font-medium mb-2">{q.question_text}</p>
                                      <div className="space-y-1">
                                        {q.choices.map((choice, idx) => (
                                          <p
                                            key={idx}
                                            className={`text-sm ${
                                              choice.startsWith(q.correct_answer)
                                                ? 'text-green-600 font-medium'
                                                : 'text-gray-600'
                                            }`}
                                          >
                                            {choice}
                                          </p>
                                        ))}
                                      </div>
                                      {q.explanation && (
                                        <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                          <p className="text-xs text-blue-700">
                                            <span className="font-medium">Penjelasan:</span> {q.explanation}
                                          </p>
                                        </div>
                                      )}
                                      {q.image_url && (
                                        <div className="mt-2">
                                          <a
                                            href={q.image_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                          >
                                            🖼️ Lihat Gambar
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-shrink-0">
                                      {confirmDeleteQuestion === q.id ? (
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleDeleteQuestion(q.id)}
                                            className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg transition-colors"
                                          >
                                            Ya
                                          </button>
                                          <button
                                            onClick={() => setConfirmDeleteQuestion(null)}
                                            className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded-lg transition-colors"
                                          >
                                            Batal
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setConfirmDeleteQuestion(q.id)}
                                          className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors"
                                        >
                                          🗑️ Hapus
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
