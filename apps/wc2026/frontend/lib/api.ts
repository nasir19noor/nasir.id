/**
 * Lightweight server-side fetch helper for the wc2026 API.
 *
 * All page components render on the server (no client-side fetching), so a
 * plain fetch with `cache` knobs is enough. Fresh data shows up within
 * REVALIDATE_SECONDS of an upstream change.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://api.wc2026.nasir.id'

const REVALIDATE_SECONDS = 300

// ─── Admin auth (HTTP Basic) ──────────────────────────────────────
// Credentials live only in browser sessionStorage — never cookies, never
// localStorage — so they vanish when the tab closes.

const ADMIN_KEY = 'wc2026.admin.basic'

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
 * Server-side fetch helper.
 *
 * By default responses are cached for REVALIDATE_SECONDS. Pass
 * `{ noStore: true }` to bypass the cache entirely — used by pages that must
 * reflect an upstream change immediately (e.g. predictions after a manual
 * admin trigger).
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
  code: string
  name: string
  iso2?: string | null
  group_letter?: string | null
  confederation?: string | null
}

export type Fixture = {
  id: number
  group_letter?: string | null
  match_no?: number | null
  home: Team
  away: Team
  home_score?: number | null
  away_score?: number | null
  status: 'scheduled' | 'live' | 'finished'
  kickoff?: string | null
  venue?: string | null
}

export type Standing = {
  team: Team
  played: number; won: number; drawn: number; lost: number
  gf: number; ga: number; gd: number; points: number
}

export type Group = {
  letter: string
  standings: Standing[]
  fixtures: Fixture[]
}

export type Knockout = {
  id: number
  round_code: 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final'
  slot: number
  home_label?: string | null
  away_label?: string | null
  home?: Team | null
  away?: Team | null
  home_score?: number | null
  away_score?: number | null
  winner?: Team | null
  status: string
  kickoff?: string | null
  venue?: string | null
}
export type Bracket = { round_code: Knockout['round_code']; matches: Knockout[] }

export type Player = {
  id: number; jersey_number?: number | null
  name: string; position?: string | null; age?: number | null
  caps: number; intl_goals: number; club?: string | null
  is_captain: boolean; wc_goals: number
}
export type Squad = { team: Team; players: Player[] }

export type Scorer = {
  rank: number; player: string; team: Team
  club?: string | null; goals: number
}

// ─── AI predictions ─────────────────────────────────────────────

export type MatchPrediction = {
  fixture_id: number
  home: string; away: string
  predicted_winner: string
  home_win_pct: number; draw_pct: number; away_win_pct: number
  likely_score: string
  confidence: string
  reasoning: string
}

export type ScorerPrediction = {
  rank: number; player: string; team: string
  current_goals: number; projected_final_goals: number
  reasoning: string
}

export type Prediction<T> = {
  kind: string
  date: string
  model: string
  generated_at: string | null
  data: T
}

export type ActualResult = {
  status: string
  home_score: number | null
  away_score: number | null
  winner: string | null
  settled: boolean
}

export type EvaluatedMatch = MatchPrediction & {
  actual: ActualResult
  correct: boolean | null   // null = not played yet
}

export type DayAccuracy = {
  evaluated: number; correct: number
  exact_score: number; accuracy_pct: number | null
}

export type HistoryDay = {
  date: string
  model: string
  generated_at: string | null
  predictions: EvaluatedMatch[]
  accuracy: DayAccuracy
}

export type HistoryPage = {
  page: number; page_size: number; total: number; pages: number
  days: HistoryDay[]
}

export type OverallAccuracy = {
  total_days: number; days_evaluated: number
  evaluated: number; correct: number; accuracy_pct: number | null
  exact_score: number; exact_score_pct: number | null
}

