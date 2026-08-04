import Link from 'next/link'
import { notFound } from 'next/navigation'
import { api, type TeamDetail } from '@/lib/api'
import FixturesList from '@/components/FixturesList'

export const revalidate = 300

const ROUND_LABEL: Record<string, string> = {
  league:  'League Phase',
  playoff: 'Knockout Play-offs',
  r16:     'Round of 16',
  qf:      'Quarter-finals',
  sf:      'Semi-finals',
  final:   'Final',
}

const ZONE_LABEL: Record<string, string> = {
  direct:  'Top 8 — straight to the Round of 16',
  playoff: 'Places 9-24 — knockout play-offs',
  out:     'Places 25-36 — eliminated',
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await api<TeamDetail>(`/teams/${id}`).catch(() => null)
  if (!detail) notFound()

  const { team, standing, fixtures, scorers } = detail
  const rounds = [...new Set(fixtures.map(f => f.round_code))]

  return (
    <div className="space-y-6">
      {/* Club header — tinted with the club's primary color */}
      <section className="card overflow-hidden">
        <div className="flex items-center gap-4 p-6 text-chalk"
             style={{ backgroundColor: team.color ? `#${team.color}` : '#0b164a' }}>
          {team.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.logo} alt={team.name} width={64} height={64}
                 className="shrink-0 rounded bg-white/90 object-contain p-1" />
          )}
          <div>
            <h1 className="text-2xl font-extrabold drop-shadow-sm">{team.name}</h1>
            <p className="text-sm opacity-90 drop-shadow-sm">
              {[team.venue, team.city, team.country].filter(Boolean).join(' · ') || team.code}
            </p>
          </div>
        </div>
        {standing && (
          <div className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-6">
            <Stat label="Position" value={standing.position} />
            <Stat label="Points"   value={standing.points} />
            <Stat label="Played"   value={standing.played} />
            <Stat label="W-D-L"    value={`${standing.won}-${standing.drawn}-${standing.lost}`} />
            <Stat label="Goals"    value={`${standing.gf}:${standing.ga}`} />
            <Stat label="GD"       value={standing.gd > 0 ? `+${standing.gd}` : standing.gd} />
          </div>
        )}
        {standing && (
          <p className="border-t border-black/5 px-4 py-2 text-xs text-black/50">
            {ZONE_LABEL[standing.zone]}
          </p>
        )}
      </section>

      {/* Fixtures by round */}
      {rounds.map(rc => (
        <section key={rc}>
          <h2 className="mb-3 text-lg font-bold">{ROUND_LABEL[rc] ?? rc}</h2>
          <div className="card">
            <FixturesList fixtures={fixtures.filter(f => f.round_code === rc)} />
          </div>
        </section>
      ))}
      {fixtures.length === 0 && (
        <div className="card p-6 text-sm text-black/70">No fixtures yet.</div>
      )}

      {/* Club scorers */}
      {scorers.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Scorers</h2>
          <div className="card divide-y divide-black/5">
            {scorers.map((s, i) => (
              <div key={s.player} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="flex items-center gap-3">
                  <span className="w-5 font-mono text-black/40">{i + 1}.</span>
                  <span className="font-medium">{s.player}</span>
                </span>
                <span className="font-mono font-bold">{s.goals}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <Link href="/teams" className="inline-block text-sm text-night underline">
        ← All clubs
      </Link>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-night/5 p-3 text-center">
      <div className="text-xl font-extrabold text-night">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-black/60">{label}</div>
    </div>
  )
}
