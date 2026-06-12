'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  API_BASE, adminHeaders, clearAdminAuth, getAdminAuth, setAdminAuth,
} from '@/lib/api'

// ─── Types ─────────────────────────────────────────────────────────

type StatusResponse = {
  seeded: boolean
  teams: number
  players: number
  fixtures: number
  knockout_matches: number
  last_refresh?: string | null
}

type Analytics = {
  window_days:   number
  total_views:   number
  views_window:  number
  unique_ips:    number
  by_day:        { date: string; views: number; unique: number }[]
  top_paths:     { label: string; views: number }[]
  top_browsers:  { label: string; views: number }[]
  top_os:        { label: string; views: number }[]
  top_devices:   { label: string; views: number }[]
  top_countries: { label: string; views: number }[]
  recent: {
    timestamp: string | null; path: string; ip: string | null
    country: string | null; browser: string; os: string; device: string
    referrer: string | null
  }[]
}

type ActionState = {
  loading: boolean; response?: unknown; error?: string; finishedAt?: string
}

const ACTIONS = [
  { key: 'refresh',     label: 'Refresh from ESPN',
    path: '/admin/refresh',
    blurb: 'Pull the latest fixtures, scores, knockout matches, and goal scorers from ESPN. Idempotent.' },
  { key: 'load-squads', label: 'Load Squads from Spreadsheet',
    path: '/admin/load-squads',
    blurb: 'Re-import the 26-player squads (jersey, club, captain) from the bundled wall-chart spreadsheet.' },
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
          Restricted area. Credentials are configured in the backend's <code>.env</code>.
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
                  className="w-full rounded-lg bg-pitch py-2 text-sm font-bold text-chalk hover:bg-pitch/90">
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
  const [stats,   setStats]   = useState<Analytics | null>(null)
  const [errStatus, setErrStatus] = useState<string | null>(null)
  const [errStats,  setErrStats]  = useState<string | null>(null)
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

  const loadStats = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/admin/analytics?days=7&top=10&recent=20`,
                            { headers: adminHeaders(), cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setStats(await r.json()); setErrStats(null)
    } catch (e) {
      setErrStats(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => { loadStatus(); loadStats() }, [loadStatus, loadStats])

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
          finishedAt: new Date().toLocaleTimeString(),
        },
      }))
      loadStatus(); loadStats()
    } catch (e) {
      setState(s => ({
        ...s,
        [key]: { loading: false, error: e instanceof Error ? e.message : String(e),
                 finishedAt: new Date().toLocaleTimeString() },
      }))
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Admin</h1>
          <p className="text-sm text-black/60">
            Backend actions and visitor analytics. API: <code className="font-mono">{API_BASE}</code>
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
          <h2 className="text-sm font-bold uppercase tracking-wide text-pitch">Backend state</h2>
          <button onClick={loadStatus}
                  className="rounded bg-pitch/10 px-3 py-1 text-xs font-medium hover:bg-pitch/20">
            Reload
          </button>
        </div>
        {errStatus && <p className="text-sm text-red-700">⚠️ {errStatus}</p>}
        {status && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Teams"    value={status.teams} />
            <Stat label="Players"  value={status.players} />
            <Stat label="Fixtures" value={status.fixtures} />
            <Stat label="Knockout" value={status.knockout_matches} />
            <Stat label="Seeded"   value={status.seeded ? 'yes' : 'no'} />
          </div>
        )}
        {status?.last_refresh && (
          <p className="mt-3 text-xs text-black/50">
            Last scheduler tick: {new Date(status.last_refresh).toLocaleString()}
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
                        className="shrink-0 rounded-lg bg-pitch px-4 py-2 text-sm font-bold text-chalk
                                   hover:bg-pitch/90 disabled:opacity-60">
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

      {/* Visitor analytics */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Visitor analytics</h2>
          <button onClick={loadStats}
                  className="rounded bg-pitch/10 px-3 py-1 text-xs font-medium hover:bg-pitch/20">
            Reload
          </button>
        </div>
        {errStats && <p className="text-sm text-red-700">⚠️ {errStats}</p>}
        {stats && <AnalyticsView a={stats} />}
      </section>
    </div>
  )
}

// ─── Analytics view ────────────────────────────────────────────────

function AnalyticsView({ a }: { a: Analytics }) {
  const dayMax = Math.max(1, ...a.by_day.map(d => d.views))
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total views"             value={a.total_views} />
        <Stat label={`Views, ${a.window_days}d`}  value={a.views_window} />
        <Stat label={`Unique IPs, ${a.window_days}d`} value={a.unique_ips} />
        <Stat label="Recent rows"             value={a.recent.length} />
      </div>

      {/* Daily mini-chart */}
      <div className="card p-4">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-pitch">
          Daily activity (last {a.window_days} days)
        </h3>
        {a.by_day.length === 0 && (
          <p className="text-sm text-black/50">No traffic yet — open the site in another tab to generate a hit.</p>
        )}
        <div className="flex items-end gap-1">
          {a.by_day.map(d => (
            <div key={d.date} className="flex flex-1 flex-col items-center text-[10px] text-black/50">
              <div className="w-full rounded-t bg-pitch"
                   style={{ height: `${Math.max(4, (d.views / dayMax) * 80)}px` }}
                   title={`${d.views} views, ${d.unique} unique`} />
              <span className="mt-1">{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top breakdowns */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <TopTable title="Top pages"     rows={a.top_paths} />
        <TopTable title="Browsers"      rows={a.top_browsers} />
        <TopTable title="Operating systems" rows={a.top_os} />
        <TopTable title="Devices"       rows={a.top_devices} />
        <TopTable title="Countries"     rows={a.top_countries} />
      </div>

      {/* Recent visitors */}
      <div className="card overflow-hidden">
        <h3 className="px-4 pt-4 pb-2 text-sm font-bold uppercase tracking-wide text-pitch">
          Recent visitors
        </h3>
        <table className="w-full text-xs">
          <thead className="bg-pitch/5 text-pitch">
            <tr>
              <th className="px-3 py-2 text-left">When</th>
              <th className="px-3 py-2 text-left">Path</th>
              <th className="px-3 py-2 text-left">IP</th>
              <th className="px-3 py-2 text-left">Country</th>
              <th className="px-3 py-2 text-left">Device</th>
              <th className="px-3 py-2 text-left">Browser / OS</th>
            </tr>
          </thead>
          <tbody>
            {a.recent.map((r, i) => (
              <tr key={i} className="border-t border-black/5">
                <td className="px-3 py-1.5 text-black/60 whitespace-nowrap">
                  {r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'}
                </td>
                <td className="px-3 py-1.5 font-mono">{r.path}</td>
                <td className="px-3 py-1.5 font-mono text-black/50">{r.ip ?? '—'}</td>
                <td className="px-3 py-1.5">{r.country ?? '—'}</td>
                <td className="px-3 py-1.5">{r.device}</td>
                <td className="px-3 py-1.5 text-black/70">
                  {r.browser}{r.os ? ` · ${r.os}` : ''}
                </td>
              </tr>
            ))}
            {a.recent.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-black/50">
                No visitors recorded yet.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TopTable({ title, rows }: { title: string; rows: Analytics['top_paths'] }) {
  const max = Math.max(1, ...rows.map(r => r.views))
  return (
    <div className="card p-4">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-pitch">{title}</h3>
      {rows.length === 0 && <p className="text-xs text-black/50">No data yet.</p>}
      <ul className="space-y-1.5 text-sm">
        {rows.map(r => (
          <li key={r.label} className="flex items-center gap-2">
            <span className="w-32 shrink-0 truncate font-mono text-xs" title={r.label}>{r.label}</span>
            <div className="h-2 flex-1 rounded bg-black/5">
              <div className="h-2 rounded bg-pitch" style={{ width: `${(r.views / max) * 100}%` }} />
            </div>
            <span className="w-8 shrink-0 text-right font-mono text-xs">{r.views}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-pitch/5 p-3 text-center">
      <div className="text-2xl font-extrabold text-pitch">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-black/60">{label}</div>
    </div>
  )
}
