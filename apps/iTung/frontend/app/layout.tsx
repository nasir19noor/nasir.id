import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'iTung — Belajar Matematika',
  description: 'Latihan matematika adaptif dan seru untuk siswa SD - SMA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}
