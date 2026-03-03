'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { getMe, type User } from './api'

const TOKEN_KEY = 'itung_token'

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY)
}

export function setToken(token: string): void {
  Cookies.set(TOKEN_KEY, token, { expires: 1, sameSite: 'strict' })
}

export function removeToken(): void {
  Cookies.remove(TOKEN_KEY)
}

export function useAuth(requireAuth = true) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    removeToken()
    router.push('/')
  }, [router])

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      if (requireAuth) router.push('/')
      return
    }
    getMe()
      .then(setUser)
      .catch(() => {
        removeToken()
        if (requireAuth) router.push('/')
      })
      .finally(() => setLoading(false))
  }, [router, requireAuth])

  return { user, loading, logout, setUser }
}
