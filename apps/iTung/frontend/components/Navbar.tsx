'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth'

export default function Navbar() {
  const { user, logout } = useAuth(false)

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-primary-600 text-lg">
          <span className="text-2xl">🧮</span> iTung
        </Link>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-primary-600 transition-colors">
                Beranda
              </Link>
              <Link href="/progress" className="text-sm text-gray-600 hover:text-primary-600 transition-colors">
                Perkembangan
              </Link>
              {user.is_admin && (
                <Link href="/admin" className="text-sm font-semibold text-purple-600 hover:text-purple-800 transition-colors">
                  ⚙️ Admin
                </Link>
              )}
              <Link href="/profile" className="text-sm text-gray-600 hover:text-primary-600 transition-colors">
                {user.full_name ?? user.username}
              </Link>
              <button
                onClick={logout}
                className="text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                Keluar
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
