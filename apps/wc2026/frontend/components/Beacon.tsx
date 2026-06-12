'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { API_BASE } from '@/lib/api'

/**
 * Fires one POST /track for every page mount + every client-side navigation.
 * Stays out of the way (fire-and-forget, no UI).
 */
export default function Beacon() {
  const pathname = usePathname()
  useEffect(() => {
    const body = JSON.stringify({ path: pathname, referrer: document.referrer || null })
    try {
      const blob = new Blob([body], { type: 'application/json' })
      const sent = navigator.sendBeacon?.(`${API_BASE}/track`, blob)
      if (!sent) {
        // Fallback for browsers without sendBeacon.
        fetch(`${API_BASE}/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body, keepalive: true,
        }).catch(() => {})
      }
    } catch {
      /* never break the page over analytics */
    }
  }, [pathname])
  return null
}
