'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { register, sendOtp, googleLogin } from '@/lib/api'
import { setToken } from '@/lib/auth'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    username: '', email: '', full_name: '', password: '', phone: '', otp: '',
  })
  const [birthDay, setBirthDay] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [error, setError] = useState('')
  const [otpError, setOtpError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSendOtp() {
    if (!form.phone.trim()) { setOtpError('Masukkan nomor HP terlebih dahulu.'); return }
    setOtpError('')
    setSendingOtp(true)
    try {
      await sendOtp(form.phone.trim())
      setOtpSent(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setOtpError(msg ?? 'Gagal mengirim OTP. Coba lagi.')
    } finally {
      setSendingOtp(false)
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

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!otpSent) { setError('Verifikasi nomor WhatsApp terlebih dahulu.'); return }
    setError('')
    setLoading(true)
    try {
      await register({
        username: form.username,
        email: form.email,
        full_name: form.full_name || undefined,
        password: form.password,
        phone_number: form.phone.trim(),
        otp_code: form.otp.trim(),
        birth_date: `${birthYear}-${birthMonth}-${birthDay}`,
      })
      router.push('/?registered=1')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Gagal mendaftar. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-emerald-100 px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-7">
          <span className="text-4xl">🧮</span>
          <h1 className="text-xl font-bold text-primary-700 mt-2">Daftar Akun iTung</h1>
          <p className="text-xs text-gray-500 mt-1">Mulai belajar matematika sekarang!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Standard fields */}
          {[
            { key: 'username',  label: 'Username',    type: 'text',     placeholder: 'Minimal 3 karakter',  required: true },
            { key: 'email',     label: 'Email',        type: 'email',    placeholder: 'email@contoh.com',    required: true },
            { key: 'full_name', label: 'Nama Lengkap', type: 'text',     placeholder: 'Opsional',            required: false },
            { key: 'password',  label: 'Password',     type: 'password', placeholder: 'Minimal 6 karakter',  required: true },
          ].map(({ key, label, type, placeholder, required }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}{required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => set(key, e.target.value)}
                required={required}
                placeholder={placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          ))}

          {/* Birth date */}
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

          {/* Phone + OTP section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nomor WhatsApp <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => { set('phone', e.target.value); setOtpSent(false) }}
                required
                placeholder="08xxxxxxxxxx"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || !form.phone.trim()}
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
                value={form.otp}
                onChange={(e) => set('otp', e.target.value.replace(/\D/g, ''))}
                required
                placeholder="6 digit kode dari WhatsApp"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-400 mt-1">Cek WhatsApp nomor {form.phone} — berlaku 5 menit</p>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !otpSent || form.otp.length < 6 || !birthDay || !birthMonth || !birthYear}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? 'Mendaftar...' : 'Daftar'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">atau daftar dengan</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="flex justify-center">
          {GOOGLE_CLIENT_ID ? (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Gagal masuk dengan Google. Coba lagi.')}
              text="signup_with"
              shape="rectangular"
            />
          ) : (
            <p className="text-xs text-red-400">Google login tidak dikonfigurasi</p>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-primary-600 font-semibold hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
    </GoogleOAuthProvider>
  )
}
