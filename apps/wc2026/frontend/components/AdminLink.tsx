'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getAdminAuth } from '@/lib/api'

/**
 * Only renders the "Admin" navbar link when a Basic-auth token is already
 * sitting in sessionStorage. Non-admins don't see the link at all; admins
 * still need the password on first visit (the form at /admin handles that).
 */
export default function AdminLink() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(!!getAdminAuth())
    const onStorage = () => setShow(!!getAdminAuth())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  if (!show) return null
  return (
    <Link href="/admin" className="opacity-90 hover:text-accent hover:opacity-100">
      Admin
    </Link>
  )
}
