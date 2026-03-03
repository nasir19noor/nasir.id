'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { updateMe, deleteMe, getApiKeys, updateApiKey, deleteApiKey, type ApiKeysResponse } from '@/lib/api'
import { removeToken } from '@/lib/auth'
import Navbar from '@/components/Navbar'

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading, setUser } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [saveError, setSaveError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // API key state
  const [apiKeys, setApiKeys] = useState<ApiKeysResponse | null>(null)
  const [editingProvider, setEditingProvider] = useState<'claude' | 'gemini' | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [keyError, setKeyError] = useState('')
  const [keySaving, setKeySaving] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      getApiKeys().then(setApiKeys).catch(() => {})
    }
  }, [loading, user])

  function startEdit() {
    setFullName(user?.full_name ?? '')
    setEmail(user?.email ?? '')
    setEditing(true)
    setSaveMsg('')
    setSaveError('')
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    setSaveMsg('')
    try {
      const updated = await updateMe({
        full_name: fullName || undefined,
        email: email || undefined,
      })
      setUser(updated)
      setEditing(false)
      setSaveMsg('Profil berhasil diperbarui.')
    } catch {
      setSaveError('Gagal menyimpan. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate() {
    try {
      await deleteMe()
      removeToken()
      router.push('/')
    } catch {
      alert('Gagal menonaktifkan akun.')
    }
  }

  function startKeyEdit(provider: 'claude' | 'gemini') {
    setEditingProvider(provider)
    setKeyInput('')
    setShowKey(false)
    setKeyError('')
  }

  async function handleKeySave() {
    if (!editingProvider || !keyInput.trim()) return
    setKeySaving(true)
    setKeyError('')
    try {
      await updateApiKey(editingProvider, keyInput.trim())
      const updated = await getApiKeys()
      setApiKeys(updated)
      setEditingProvider(null)
    } catch {
      setKeyError('Gagal menyimpan. Periksa kunci dan coba lagi.')
    } finally {
      setKeySaving(false)
    }
  }

  async function handleKeyDelete(provider: 'claude' | 'gemini') {
    try {
      await deleteApiKey(provider)
      const updated = await getApiKeys()
      setApiKeys(updated)
    } catch {
      alert('Gagal menghapus kunci.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Memuat...</p>
      </div>
    )
  }

  const providers: { id: 'claude' | 'gemini'; label: string; hint: string }[] = [
    { id: 'claude', label: 'Claude (Anthropic)', hint: 'sk-ant-...' },
    { id: 'gemini', label: 'Gemini (Google)', hint: 'AIza...' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-10 space-y-6">

        <button onClick={() => router.push('/dashboard')} className="text-sm text-primary-600 hover:underline flex items-center gap-1">
          ← Kembali ke Beranda
        </button>

        {/* Profile card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-700">
              {(user?.full_name ?? user?.username ?? '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-800">{user?.full_name ?? user?.username}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${user?.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {user?.is_active ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
          </div>

          {!editing ? (
            <div className="space-y-3">
              <Row label="Username" value={user?.username ?? '-'} />
              <Row label="Email" value={user?.email ?? '-'} />
              <Row label="Nama Lengkap" value={user?.full_name ?? '-'} />
              {saveMsg && <p className="text-sm text-green-600">{saveMsg}</p>}
              <button
                onClick={startEdit}
                className="mt-2 w-full border border-primary-400 text-primary-600 hover:bg-primary-50 font-semibold py-2 rounded-lg text-sm transition-colors"
              >
                ✏️ Edit Profil
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold py-2 rounded-lg text-sm transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* API Keys card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 mb-1">🔑 API Keys Saya</h3>
          <p className="text-xs text-gray-500 mb-4">
            Tambahkan kunci API Claude atau Gemini untuk menggunakan fitur AI dengan kuota sendiri.
          </p>

          <div className="space-y-4">
            {providers.map(({ id, label, hint }) => {
              const info = apiKeys?.[id]
              const isEditing = editingProvider === id

              return (
                <div key={id} className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{label}</p>
                      {info?.has_key ? (
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{info.preview}</p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">Belum diset</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!isEditing && (
                        <button
                          onClick={() => startKeyEdit(id)}
                          className="text-xs border border-primary-400 text-primary-600 hover:bg-primary-50 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {info?.has_key ? 'Ganti' : 'Tambah'}
                        </button>
                      )}
                      {info?.has_key && !isEditing && (
                        <button
                          onClick={() => handleKeyDelete(id)}
                          className="text-xs border border-red-300 text-red-500 hover:bg-red-50 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={keyInput}
                          onChange={(e) => setKeyInput(e.target.value)}
                          placeholder={hint}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pr-10 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                        >
                          {showKey ? '🙈' : '👁️'}
                        </button>
                      </div>
                      {keyError && <p className="text-xs text-red-600">{keyError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={handleKeySave}
                          disabled={keySaving || !keyInput.trim()}
                          className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-1.5 rounded-lg text-xs transition-colors disabled:opacity-60"
                        >
                          {keySaving ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <button
                          onClick={() => setEditingProvider(null)}
                          className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold py-1.5 rounded-lg text-xs transition-colors"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-xs text-gray-400 mt-4">
            🔒 Kunci dienkripsi dan tidak pernah dibagikan kepada siapapun.
          </p>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6">
          <h3 className="font-bold text-red-600 mb-1">⚠️ Zona Berbahaya</h3>
          <p className="text-xs text-gray-500 mb-4">Menonaktifkan akun tidak dapat dibatalkan.</p>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full border border-red-400 text-red-600 hover:bg-red-50 font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              Nonaktifkan Akun
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-red-700">Yakin ingin menonaktifkan akun?</p>
              <div className="flex gap-3">
                <button onClick={handleDeactivate} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors">
                  Ya, Nonaktifkan
                </button>
                <button onClick={() => setConfirmDelete(false)} className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold py-2 rounded-lg text-sm transition-colors">
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  )
}
