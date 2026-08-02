/**
 * Lightweight server-side fetch helper for the ucl API.
 *
 * All page components render on the server (no client-side fetching), so a
 * plain fetch with `cache` knobs is enough. Fresh data shows up within
 * REVALIDATE_SECONDS of an upstream change.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://api.ucl.nasir.id'

const REVALIDATE_SECONDS = 300

// ─── Admin auth (HTTP Basic) ──────────────────────────────────────
// Credentials live only in browser sessionStorage — never cookies, never
// localStorage — so they vanish when the tab closes.

const ADMIN_KEY = 'ucl.admin.basic'

export function getAdminAuth(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(ADMIN_KEY)
}

export function setAdminAuth(user: string, pass: string) {
  const token = btoa(`${user}:${pass}`)
  sessionStorage.setItem(ADMIN_KEY, token)
}

export function clearAdminAuth() {
  sessionStorage.removeItem(ADMIN_KEY)
}

export function adminHeaders(): HeadersInit {
  const token = getAdminAuth()
  return token ? { Authorization: `Basic ${token}` } : {}
}

// ─── Time formatting (always WIB / Asia/Jakarta) ──────────────────
// Server components format in the container's zone (UTC) unless told
// otherwise, which is misleading for an Indonesian audience. Pin to WIB.

const WIB_TZ = 'Asia/Jakarta'

export function fmtWIB(value?: string | number | Date | null): string {
  if (value === null || value === undefined || value === '') return '—'
  return new Date(value).toLocaleString('en-GB', {
    timeZone: WIB_TZ,
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }) + ' WIB'
}

export function fmtWIBTime(value?: string | number | Date | null): string {
  if (value === null || value === undefined || value === '') return '—'
  return new Date(value).toLocaleTimeString('en-GB', {
    timeZone: WIB_TZ,
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }) + ' WIB'
}

/**
 * Server-side fetch helper. Responses are cached for REVALIDATE_SECONDS;
 * pass `{ noStore: true }` to bypass the cache entirely.
 */
export async function api<T>(
  path: string,
  opts?: { noStore?: boolean },
): Promise<T> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, opts?.noStore
    ? { cache: 'no-store' }
    : { next: { revalidate: REVALIDATE_SECONDS } })
  if (!res.ok) {
    throw new Error(`API ${res.status} ${path}`)
  }
  return res.json() as Promise<T>
}

// ─── Types mirroring backend schemas ────────────────────────────

export type Team = {
  id: number
  code?: string | null
  name: string
  logo?: string | null
}

export type Fixture = {
  id: number
  round_code: 'league' | 'playoff' | 'r16' | 'qf' | 'sf' | 'final'
  matchday?: number | null
  home: Team
  away: Team
  home_score?: number | null
  away_score?: number | null
  home_shootout?: number | null
  away_shootout?: number | null
  status: 'scheduled' | 'live' | 'finished'
  kickoff?: string | null
  venue?: string | null
}

export type Standing = {
  position: number
  team: Team
  played: number; won: number; drawn: number; lost: number
  gf: number; ga: number; gd: number; points: number
  zone: 'direct' | 'playoff' | 'out'
}

export type Table = { standings: Standing[]; matchdays: number }

export type Tie = {
  team_a: Team
  team_b: Team
  legs: Fixture[]
  agg_a?: number | null
  agg_b?: number | null
  winner?: Team | null
  decided: boolean
}

export type Round = {
  round_code: 'playoff' | 'r16' | 'qf' | 'sf' | 'final'
  label: string
  ties: Tie[]
}

export type Scorer = {
  rank: number; player: string; team: Team; goals: number
}

export type Status = {
  seeded: boolean; teams: number; players: number
  fixtures: number; last_refresh?: string | null
}
