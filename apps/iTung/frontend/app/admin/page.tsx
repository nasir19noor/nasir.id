'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { adminGetUsers, adminUpdateUser, adminDeleteUser, User } from '@/lib/api'
import Navbar from '@/components/Navbar'

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
  const [users, setUsers] = useState<User[]>([])
  const [fetching, setFetching] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  useEffect(() => {
    if (loading) return
    if (!me?.is_admin) { router.replace('/dashboard'); return }
    adminGetUsers()
      .then(setUsers)
      .finally(() => setFetching(false))
  }, [loading, me, router])

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

  if (loading || fetching) {
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

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">⚙️ Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola pengguna dan hak akses</p>
        </div>

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

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-800">Daftar Pengguna</h2>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama / email..."
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-52"
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
      </main>
    </div>
  )
}
