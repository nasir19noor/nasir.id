'use client'

import { useEffect, useState } from 'react'
import { API_BASE } from '@/lib/api'

type ActionState = {
  loading: boolean
  response?: unknown
  error?: string
  finishedAt?: string
}

type StatusResponse = {
  seeded: boolean
  teams: number
  players: number
  fixtures: number
  knockout_matches: number
  last_refresh?: string | null
}

const ACTIONS = [
  {
    key:     'refresh',
    label:   'Refresh from ESPN',
    method:  'POST' as const,
    path:    '/admin/refresh',
    blurb:   'Pull the latest fixtures, scores, knockout matches, and goal scorers from ESPN. Idempotent; safe to repeat.',
  },
  {
    key:     'load-squads',
    label:   'Load Squads from Spreadsheet',
    method:  'POST' as const,
    path:    '/admin/load-squads',
    blurb:   'Re-import the 26-player squads (jersey, club, captain) from the bundled wall-chart spreadsheet.',
  },
]

export default function AdminPage() {
  const [state,  setState]  = useState<Record<string, ActionState>>({})
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  async function loadStatus() {
    try {
      const r = await fetch(`${API_BASE}/status`, { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setStatus(await r.json())
      setStatusError(null)
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => { loadStatus() }, [])

  async function trigger(key: string, method: 'POST', path: string) {
    setState(s => ({ ...s, [key]: { loading: true } }))
    try {
      const r   = await fetch(`${API_BASE}${path}`, { method })
      const txt = await r.text()
      let body: unknown
      try { body = JSON.parse(txt) } catch { body = txt }
      if (!r.ok) {
        setState(s => ({
          ...s,
          [key]: { loading: false, error: `HTTP ${r.status}`, response: body,
                   finishedAt: new Date().toLocaleTimeString() },
        }))
      } else {
        setState(s => ({
          ...s,
          [key]: { loading: false, response: body,
                   finishedAt: new Date().toLocaleTimeString() },
        }))
      }
      loadStatus()
    } catch (e) {
      setState(s => ({
        ...s,
        [key]: { loading: false, error: e instanceof Error ? e.message : String(e),
                 finishedAt: new Date().toLocaleTimeString() },
      }))
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Admin</h1>
        <p className="text-sm text-black/60">
          Manually trigger backend data fetches. The same actions also run
          automatically on the hourly scheduler.
        </p>
        <p className="mt-1 text-xs text-black/50">
          API: <code className="font-mono">{API_BASE}</code>
        </p>
      </header>

      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-pitch">
            Current state
          </h2>
          <button onClick={loadStatus}
                  className="rounded bg-pitch/10 px-3 py-1 text-xs font-medium hover:bg-pitch/20">
            Reload
          </button>
        </div>
        {statusError && <p className="text-sm text-red-700">⚠️ {statusError}</p>}
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

      <section className="space-y-4">
        {ACTIONS.map(a => {
          const st = state[a.key] || { loading: false }
          return (
            <article key={a.key} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold">{a.label}</h3>
                  <p className="mt-1 text-sm text-black/60">{a.blurb}</p>
                  <p className="mt-1 text-xs text-black/40">
                    <span className="font-mono">{a.method} {a.path}</span>
                  </p>
                </div>
                <button onClick={() => trigger(a.key, a.method, a.path)}
                        disabled={st.loading}
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
                  <pre className="max-h-72 overflow-auto rounded bg-black/5 p-3
                                   font-mono text-xs leading-tight">
{typeof st.response === 'string'
  ? st.response
  : JSON.stringify(st.response, null, 2)}
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
    <div className="rounded-lg bg-pitch/5 p-3 text-center">
      <div className="text-2xl font-extrabold text-pitch">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-black/60">{label}</div>
    </div>
  )
}
