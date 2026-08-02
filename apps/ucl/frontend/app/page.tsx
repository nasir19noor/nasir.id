import Link from 'next/link'
import { api, type Fixture, type Scorer, type Table } from '@/lib/api'
import FixturesList from '@/components/FixturesList'
import TeamBadge from '@/components/TeamBadge'

export const revalidate = 300

export default async function HomePage() {
  // Pull everything in parallel for speed. Every call falls back to an empty
  // value so the page renders even before the draw populates the database.
  const [table, today, scorers] = await Promise.all([
    api<Table>('/table').catch(() => ({ standings: [], matchdays: 0 }) as Table),
    api<Fixture[]>('/fixtures/today').catch(() => [] as Fixture[]),
    api<Scorer[]>('/scorers?limit=5').catch(() => [] as Scorer[]),
  ])

  const preseason = table.standings.length === 0

  return (
    <div className="space-y-8">
      <section className="card overflow-hidden">
        <div className="bg-night p-6 text-chalk">
          <h1 className="text-3xl font-extrabold">UEFA Champions League 2026/27</h1>
          <p className="mt-1 text-sm opacity-80">
            36 clubs · one league table · 8 matchdays · knockout from February
          </p>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-3">
          <Stat label="Clubs"     value={preseason ? '36' : table.standings.length} />
          <Stat label="Matchdays played" value={table.matchdays} />
          <Stat label="Top scorer"
                value={scorers[0]?.goals ?? 0}
                hint={scorers[0]?.player} />
        </div>
      </section>

      {preseason && (
        <section className="card p-6 text-sm text-black/70">
          The league-phase draw takes place in late August 2026 and matchday 1
          kicks off in mid-September. Clubs and fixtures appear here
          automatically once the draw is made.
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">Today&apos;s matches</h2>
        <div className="card">
          {today.length
            ? <FixturesList fixtures={today} />
            : <p className="p-4 text-sm text-black/60">No matches today.</p>}
        </div>
      </section>

      {!preseason && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-bold">League table — top 8</h2>
            <Link href="/table" className="text-sm text-night underline">
              Full 36-club table →
            </Link>
          </div>
          <div className="card divide-y divide-black/5">
            {table.standings.slice(0, 8).map(r => (
              <div key={r.team.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="flex items-center gap-3">
                  <span className="w-5 font-mono text-black/40">{r.position}.</span>
                  <TeamBadge team={r.team} size="sm" />
                </span>
                <span className="font-mono font-bold">{r.points}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Top scorers</h2>
          <Link href="/scorers" className="text-sm text-night underline">All →</Link>
        </div>
        <div className="card divide-y divide-black/5">
          {scorers.length === 0 && (
            <p className="p-4 text-sm text-black/60">No goals recorded yet.</p>
          )}
          {scorers.map(s => (
            <div key={s.rank} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="flex items-center gap-3">
                <span className="w-5 font-mono text-black/40">{s.rank}.</span>
                <span className="font-medium">{s.player}</span>
                <TeamBadge team={s.team} size="sm" showName={false} />
              </span>
              <span className="font-mono font-bold">{s.goals}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-lg bg-night/5 p-4">
      <div className="text-3xl font-extrabold text-night">{value}</div>
      <div className="text-xs uppercase tracking-wide text-black/60">{label}</div>
      {hint && <div className="mt-1 text-xs text-black/50">{hint}</div>}
    </div>
  )
}
