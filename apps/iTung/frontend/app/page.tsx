'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getToken } from '@/lib/auth'

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    if (getToken()) router.replace('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧮</span>
            <span className="text-lg font-bold text-primary-700">iTung</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-primary-600 hover:text-primary-700 px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg transition-colors"
            >
              Daftar Gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-emerald-50 px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-6xl mb-4">🧮</div>
          <h1 className="text-4xl font-extrabold text-gray-900 leading-tight mb-4">
            Belajar Matematika<br />
            <span className="text-primary-600">Seru & Adaptif</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            iTung menyesuaikan soal matematika dengan usia dan kemampuanmu secara otomatis.
            Semakin sering berlatih, soal semakin menantang!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-3 rounded-xl text-base transition-colors shadow-md"
            >
              Mulai Belajar Gratis
            </Link>
            <Link
              href="/login"
              className="border-2 border-primary-600 text-primary-600 hover:bg-primary-50 font-bold px-8 py-3 rounded-xl text-base transition-colors"
            >
              Sudah Punya Akun? Masuk
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-10">Kenapa iTung?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: '🎯',
              title: 'Adaptif & Personal',
              desc: 'Tingkat kesulitan menyesuaikan performamu secara otomatis — tidak terlalu mudah, tidak terlalu susah.',
            },
            {
              icon: '🎂',
              title: 'Sesuai Usia',
              desc: 'Soal disesuaikan dengan usia: mulai dari SD kelas 1 hingga SMA. Cukup masukkan tanggal lahirmu.',
            },
            {
              icon: '🤖',
              title: 'AI-Powered',
              desc: 'Soal dibuat oleh AI sehingga selalu segar dan bervariasi. Tidak akan bosan mengerjakan soal yang sama.',
            },
            {
              icon: '📊',
              title: 'Pantau Progres',
              desc: 'Lihat statistik belajarmu: akurasi, soal dikerjakan, dan tingkat kesulitan saat ini.',
            },
          ].map((f) => (
            <div key={f.title} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow text-center">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-gray-800 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Difficulty levels */}
      <section className="bg-gray-50 px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">5 Tingkat Kesulitan</h2>
          <p className="text-gray-500 mb-8">Dari yang paling mudah hingga paling menantang — sistem akan menempatkanmu di level yang tepat.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: 'Sangat Mudah', color: 'bg-sky-100 text-sky-700', age: '≤ 7 tahun' },
              { label: 'Mudah', color: 'bg-green-100 text-green-700', age: '8–9 tahun' },
              { label: 'Sedang', color: 'bg-yellow-100 text-yellow-700', age: '10–11 tahun' },
              { label: 'Sulit', color: 'bg-orange-100 text-orange-700', age: '12–14 tahun' },
              { label: 'Sangat Sulit', color: 'bg-red-100 text-red-700', age: '≥ 15 tahun' },
            ].map((d) => (
              <div key={d.label} className={`${d.color} rounded-xl px-5 py-3 text-sm font-semibold`}>
                {d.label}
                <div className="text-xs font-normal mt-0.5 opacity-70">{d.age}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-10">Cara Kerja</h2>
        <div className="space-y-6">
          {[
            { step: '1', title: 'Daftar & Isi Tanggal Lahir', desc: 'Buat akun gratis. Masukkan tanggal lahirmu agar sistem bisa menentukan level awal yang sesuai.' },
            { step: '2', title: 'Mulai Latihan', desc: 'Pilih mode Soal AI atau Bank Soal. Sistem langsung membuatkan soal sesuai level dan usiamu.' },
            { step: '3', title: 'Sistem Belajar Bersamamu', desc: 'Setiap jawaban dianalisis. Benar terus? Soal makin susah. Banyak salah? Soal menyesuaikan lagi.' },
          ].map((s) => (
            <div key={s.step} className="flex gap-4 items-start">
              <div className="shrink-0 w-10 h-10 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center text-lg">
                {s.step}
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{s.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-gradient-to-br from-primary-600 to-emerald-600 px-4 py-16 text-center text-white">
        <h2 className="text-3xl font-extrabold mb-3">Siap Mulai Belajar?</h2>
        <p className="text-primary-100 mb-8 text-lg">Gratis selamanya. Tidak perlu kartu kredit.</p>
        <Link
          href="/register"
          className="bg-white text-primary-700 font-bold px-10 py-3 rounded-xl text-base hover:bg-primary-50 transition-colors shadow-lg inline-block"
        >
          Daftar Sekarang — Gratis!
        </Link>
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 py-6 border-t border-gray-100">
        © {new Date().getFullYear()} iTung — Aplikasi latihan matematika adaptif
      </footer>

    </div>
  )
}
