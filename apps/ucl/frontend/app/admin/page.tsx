'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  API_BASE, adminHeaders, clearAdminAuth, getAdminAuth, setAdminAuth,
  fmtWIB, fmtWIBTime,
} from '@/lib/api'

// ─── Types ─────────────────────────────────────────────────────────

type StatusResponse = {
  seeded: boolean
  teams: number
  players: number
  fixtures: number
  last_refresh?: string | null
}

type ActionState = {
  loading: boolean; response?: unknown; error?: string; finishedAt?: string
}

const ACTIONS = [
  { key: 'refresh', label: 'Refresh from ESPN',
    path: '/admin/refresh',
    blurb: 'Pull the latest clubs, fixtures, scores and goal scorers from ESPN. ' +
           'Also runs hourly on the scheduler. Idempotent.' },
]

// ─── Component ─────────────────────────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [user,   setUser]   = useState('')
  const [pass,   setPass]   = useState('')
  const [loginErr, setLoginErr] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(true)

  // Re-verify any saved creds on mount — the password may have rotated.
  useEffect(() => {
    if (!getAdminAuth()) { setVerifying(false); return }
    fetch(`${API_BASE}/admin/check`, { headers: adminHeaders() })
      .then(r => { setAuthed(r.ok); if (!r.ok) clearAdminAuth() })
      .catch(() => clearAdminAuth())
      .finally(() => setVerifying(false))
  }, [])

  async function tryLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginErr(null)
    setAdminAuth(user, pass)
    const r = await fetch(`${API_BASE}/admin/check`, { headers: adminHeaders() })
    if (r.ok) {
      setAuthed(true)
      setPass('')
    } else {
      clearAdminAuth()
      setLoginErr(r.status === 401 ? 'Invalid username or password.' : `HTTP ${r.status}`)
    }
  }

  function logout() {
    clearAdminAuth()
    setAuthed(false)
    setUser(''); setPass('')
  }

  if (verifying) {
    return <p className="text-sm text-black/50">Verifying session…</p>
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm space-y-4">
        <h1 className="text-xl font-extrabold">Admin sign-in</h1>
        <p className="text-sm text-black/60">
          Restricted area. Credentials are configured in the backend&apos;s <code>.env</code>.
        </p>
        <form onSubmit={tryLogin} className="card space-y-3 p-4">
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-black/60">Username</span>
            <input type="text" autoComplete="username" value={user} required
                   onChange={e => setUser(e.target.value)}
                   className="mt-1 w-full rounded border border-black/15 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-black/60">Password</span>
            <input type="password" autoComplete="current-password" value={pass} required
                   onChange={e => setPass(e.target.value)}
                   className="mt-1 w-full rounded border border-black/15 px-3 py-2 text-sm" />
          </label>
          {loginErr && <p className="text-sm text-red-700">⚠️ {loginErr}</p>}
          <button type="submit"
                  className="w-full rounded-lg bg-night py-2 text-sm font-bold text-chalk hover:bg-night/90">
            Sign in
          </button>
        </form>
      </div>
    )
  }

  return <AdminAuthenticated onLogout={logout} />
}

// ─── Authenticated view ────────────────────────────────────────────

function AdminAuthenticated({ onLogout }: { onLogout: () => void }) {
  const [status,  setStatus]  = useState<StatusResponse | null>(null)
  const [errStatus, setErrStatus] = useState<string | null>(null)
  const [state,   setState]   = useState<Record<string, ActionState>>({})

  const loadStatus = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/status`, { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setStatus(await r.json()); setErrStatus(null)
    } catch (e) {
      setErrStatus(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  async function trigger(key: string, path: string) {
    setState(s => ({ ...s, [key]: { loading: true } }))
    try {
      const r   = await fetch(`${API_BASE}${path}`,
                              { method: 'POST', headers: adminHeaders() })
      const txt = await r.text()
      let body: unknown
      try { body = JSON.parse(txt) } catch { body = txt }
      setState(s => ({
        ...s,
        [key]: {
          loading: false,
          response: body,
          error: r.ok ? undefined : `HTTP ${r.status}`,
          finishedAt: fmtWIBTime(Date.now()),
        },
      }))
      loadStatus()
    } catch (e) {
      setState(s => ({
        ...s,
        [key]: { loading: false, error: e instanceof Error ? e.message : String(e),
                 finishedAt: fmtWIBTime(Date.now()) },
      }))
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Admin</h1>
          <p className="text-sm text-black/60">
            Backend actions. API: <code className="font-mono">{API_BASE}</code>
          </p>
        </div>
        <button onClick={onLogout}
                className="shrink-0 rounded bg-black/5 px-3 py-1.5 text-xs hover:bg-black/10">
          Sign out
        </button>
      </header>

      {/* Backend status */}
      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-night">Backend state</h2>
          <button onClick={loadStatus}
                  className="rounded bg-night/10 px-3 py-1 text-xs font-medium hover:bg-night/20">
            Reload
          </button>
        </div>
        {errStatus && <p className="text-sm text-red-700">⚠️ {errStatus}</p>}
        {status && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Clubs"    value={status.teams} />
            <Stat label="Scorers"  value={status.players} />
            <Stat label="Fixtures" value={status.fixtures} />
            <Stat label="Seeded"   value={status.seeded ? 'yes' : 'no'} />
          </div>
        )}
        {status?.last_refresh && (
          <p className="mt-3 text-xs text-black/50">
            Last scheduler tick: {fmtWIB(status.last_refresh)}
          </p>
        )}
        {status && !status.seeded && (
          <p className="mt-3 text-xs text-black/50">
            Empty database is expected before the league-phase draw (late
            August 2026) — ESPN has no 2026/27 fixtures to serve yet.
          </p>
        )}
      </section>

      {/* Manual actions */}
      <section className="space-y-4">
        {ACTIONS.map(a => {
          const st = state[a.key] || { loading: false }
          return (
            <article key={a.key} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold">{a.label}</h3>
                  <p className="mt-1 text-sm text-black/60">{a.blurb}</p>
                  <p className="mt-1 text-xs text-black/40 font-mono">POST {a.path}</p>
                </div>
                <button onClick={() => trigger(a.key, a.path)} disabled={st.loading}
                        className="shrink-0 rounded-lg bg-night px-4 py-2 text-sm font-bold text-chalk
                                   hover:bg-night/90 disabled:opacity-60">
                  {st.loading ? 'Running…' : 'Run'}
                </button>
              </div>
              {(st.response || st.error) && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className={st.error ? 'font-bold text-red-700' : 'font-bold text-green-700'}>
                      {st.error ? `Error — ${st.error}` : 'Success'}
                    </span>
                    <span className="text-black/40">at {st.finishedAt}</span>
                  </div>
                  <pre className="max-h-72 overflow-auto rounded bg-black/5 p-3 font-mono text-xs leading-tight">
{typeof st.response === 'string' ? st.response : JSON.stringify(st.response, null, 2)}
                  </pre>
                </div>
              )}
            </article>
          )
        })}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-night/5 p-3 text-center">
      <div className="text-2xl font-extrabold text-night">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-black/60">{label}</div>
    </div>
  )
}
