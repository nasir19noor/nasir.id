'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { googleLogin } from '@/lib/api'
import { setToken } from '@/lib/auth'

export default function GoogleUsernamePage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [idToken, setIdToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem('google_id_token')
    const googleEmail = sessionStorage.getItem('google_email') ?? ''
    const googleName = sessionStorage.getItem('google_name') ?? ''
    if (!token) {
      router.replace('/')
      return
    }
    setIdToken(token)
    setEmail(googleEmail)
    setName(googleName)
  }, [router])

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await googleLogin(idToken, username.trim(), birthDate)
      if (res.access_token) {
        sessionStorage.removeItem('google_id_token')
        sessionStorage.removeItem('google_email')
        sessionStorage.removeItem('google_name')
        setToken(res.access_token)
        router.push('/dashboard')
      } else {
        setError('Gagal membuat akun. Coba lagi.')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Gagal mendaftar. Coba username lain.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-emerald-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-7">
          <span className="text-4xl">🧮</span>
          <h1 className="text-xl font-bold text-primary-700 mt-2">Satu langkah lagi!</h1>
          <p className="text-sm text-gray-500 mt-1">
            Halo{name ? `, ${name}` : ''}! Pilih username untuk akun iTung kamu.
          </p>
          {email && <p className="text-xs text-gray-400 mt-1">{email}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              placeholder="Minimal 3 karakter"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Lahir <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
              max={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-400 mt-1">Digunakan untuk menyesuaikan tingkat kesulitan soal.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !username.trim() || !birthDate}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? 'Membuat akun...' : 'Mulai Belajar'}
          </button>
        </form>
      </div>
    </div>
  )
}
