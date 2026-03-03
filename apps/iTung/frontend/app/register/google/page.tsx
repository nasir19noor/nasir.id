'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { googleLogin, sendOtp } from '@/lib/api'
import { setToken } from '@/lib/auth'

export default function GoogleUsernamePage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [fullName, setFullName] = useState('')
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
    setFullName(googleName)
  }, [router])

  async function handleSendOtp() {
    if (!phone.trim()) { setOtpError('Masukkan nomor HP terlebih dahulu.'); return }
    setOtpError('')
    setSendingOtp(true)
    try {
      await sendOtp(phone.trim())
      setOtpSent(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setOtpError(msg ?? 'Gagal mengirim OTP. Coba lagi.')
    } finally {
      setSendingOtp(false)
    }
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!otpSent) { setError('Verifikasi nomor WhatsApp terlebih dahulu.'); return }
    setError('')
    setLoading(true)
    try {
      const birthDateISO = `${birthYear}-${birthMonth}-${birthDay}`
      const res = await googleLogin(idToken, username.trim(), birthDateISO, phone.trim(), otp.trim(), fullName.trim())
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-emerald-100 px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-7">
          <span className="text-4xl">🧮</span>
          <h1 className="text-xl font-bold text-primary-700 mt-2">Satu langkah lagi!</h1>
          <p className="text-sm text-gray-500 mt-1">
            Halo{name ? `, ${name}` : ''}! Lengkapi data untuk akun iTung kamu.
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
              Nama Lengkap <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Masukkan nama lengkap"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Lahir <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={birthDay}
                onChange={(e) => setBirthDay(e.target.value)}
                required
                className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Tgl</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d).padStart(2, '0')}>{String(d).padStart(2, '0')}</option>
                ))}
              </select>
              <select
                value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                required
                className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Bulan</option>
                {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((m, i) => (
                  <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
                ))}
              </select>
              <select
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                required
                className="w-24 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Tahun</option>
                {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-400 mt-1">Digunakan untuk menyesuaikan tingkat kesulitan soal.</p>
          </div>

          {/* Phone + OTP */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nomor WhatsApp <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setOtpSent(false) }}
                required
                placeholder="08xxxxxxxxxx"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || !phone.trim()}
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
              >
                {sendingOtp ? 'Mengirim...' : otpSent ? 'Kirim Ulang' : 'Kirim OTP'}
              </button>
            </div>
            {otpError && <p className="text-xs text-red-500 mt-1">{otpError}</p>}
          </div>

          {otpSent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kode OTP <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                required
                placeholder="6 digit kode dari WhatsApp"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-400 mt-1">Cek WhatsApp nomor {phone} — berlaku 5 menit</p>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !username.trim() || !fullName.trim() || !birthDay || !birthMonth || !birthYear || !otpSent || otp.length < 6}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? 'Membuat akun...' : 'Mulai Belajar'}
          </button>
        </form>
      </div>
    </div>
  )
}
