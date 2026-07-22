import Link from 'next/link'
import { api, type Group, type Scorer, type Bracket } from '@/lib/api'
import TeamBadge from '@/components/TeamBadge'
import KnockoutBracket from '@/components/KnockoutBracket'

// Tournament is complete; results are final.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // Pull everything in parallel for speed.
  const [groups, scorers, bracket] = await Promise.all([
    api<Group[]>('/groups', { noStore: true }).catch(() => [] as Group[]),
    api<Scorer[]>('/scorers?limit=5', { noStore: true }).catch(() => [] as Scorer[]),
    api<Bracket[]>('/knockout', { noStore: true }).catch(() => [] as Bracket[]),
  ])

  const champion = bracket.find(b => b.round_code === 'final')?.matches?.[0]?.winner

  return (
    <div className="space-y-8">
      <section className="card overflow-hidden">
        <div className="bg-pitch p-6 text-chalk">
          <h1 className="text-3xl font-extrabold">FIFA World Cup 2026</h1>
          <p className="mt-1 text-sm opacity-80">
            48 teams · 12 groups · 104 matches · Final results
          </p>
          {champion && (
            <Link href="/awards"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2
                             text-sm font-bold text-pitch hover:opacity-90">
              🏆 Champions: {champion.name} — see Awards &amp; Stats →
            </Link>
          )}
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-3">
          <Stat label="Groups"   value={groups.length} />
          <Stat label="Matches"  value={104} />
          <Stat label="Top scorer"
                value={scorers[0]?.goals ?? 0}
                hint={scorers[0]?.player} />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Tournament wall chart</h2>
          <Link href="/knockout" className="text-sm text-pitch underline">
            Full bracket →
          </Link>
        </div>
        <div className="card p-4">
          <KnockoutBracket bracket={bracket} />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Group leaders</h2>
          <Link href="/groups" className="text-sm text-pitch underline">
            See all groups →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map(g => (
            <Link key={g.letter} href={`/groups/${g.letter}`}
                  className="card p-4 hover:shadow-md">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-accent">
                Group {g.letter}
              </div>
              <ul className="space-y-1.5">
                {g.standings.slice(0, 4).map((r, i) => (
                  <li key={r.team.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-4 text-xs text-black/40">{i + 1}.</span>
                      <TeamBadge team={r.team} size="sm" />
                    </span>
                    <span className="font-mono font-bold">{r.points}</span>
                  </li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Top scorers</h2>
          <Link href="/scorers" className="text-sm text-pitch underline">All →</Link>
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
    <div className="rounded-lg bg-pitch/5 p-4">
      <div className="text-3xl font-extrabold text-pitch">{value}</div>
      <div className="text-xs uppercase tracking-wide text-black/60">{label}</div>
      {hint && <div className="mt-1 text-xs text-black/50">{hint}</div>}
    </div>
  )
}
