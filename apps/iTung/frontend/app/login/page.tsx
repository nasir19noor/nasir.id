'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { login, googleLogin } from '@/lib/api'
import { setToken, getToken } from '@/lib/auth'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (getToken()) router.replace('/dashboard')
  }, [router])

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(username, password)
      setToken(res.access_token)
      router.push('/dashboard')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        setError('Username atau password salah.')
      } else if (!status) {
        setError('Tidak dapat terhubung ke server. Coba lagi.')
      } else {
        setError(`Gagal login (error ${status}). Coba lagi.`)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSuccess(credentialResponse: { credential?: string }) {
    if (!credentialResponse.credential) return
    setError('')
    try {
      const res = await googleLogin(credentialResponse.credential)
      if (res.needs_username) {
        sessionStorage.setItem('google_id_token', credentialResponse.credential)
        sessionStorage.setItem('google_email', res.google_email ?? '')
        sessionStorage.setItem('google_name', res.google_name ?? '')
        router.push('/register/google')
      } else if (res.access_token) {
        setToken(res.access_token)
        router.push('/dashboard')
      }
    } catch {
      setError('Gagal masuk dengan Google. Coba lagi.')
    }
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-emerald-100 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <span className="text-5xl">🧮</span>
            <h1 className="text-2xl font-bold text-primary-700 mt-2">iTung</h1>
            <p className="text-sm text-gray-500 mt-1">Belajar matematika jadi seru!</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Masukkan username"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Masukkan password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? 'Memuat...' : 'Masuk'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">atau</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="flex justify-center">
            {GOOGLE_CLIENT_ID ? (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Gagal masuk dengan Google. Coba lagi.')}
                text="signin_with"
                shape="rectangular"
              />
            ) : (
              <p className="text-xs text-red-400">Google login tidak dikonfigurasi</p>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Belum punya akun?{' '}
            <Link href="/register" className="text-primary-600 font-semibold hover:underline">
              Daftar sekarang
            </Link>
          </p>

          <p className="text-center text-sm text-gray-500 mt-2">
            <Link href="/" className="text-gray-400 hover:underline text-xs">
              ← Kembali ke beranda
            </Link>
          </p>
        </div>
      </div>
    </GoogleOAuthProvider>
  )
}
