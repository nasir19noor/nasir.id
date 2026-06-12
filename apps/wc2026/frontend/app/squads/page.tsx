import Link from 'next/link'
import { api, type Team } from '@/lib/api'
import TeamBadge from '@/components/TeamBadge'

export const revalidate = 600

export default async function SquadsIndex() {
  const teams = await api<Team[]>('/squads').catch(() => [] as Team[])
  // Group by letter for a wall-chart feel.
  const byGroup = new Map<string, Team[]>()
  for (const t of teams) {
    const g = t.group_letter || '?'
    if (!byGroup.has(g)) byGroup.set(g, [])
    byGroup.get(g)!.push(t)
  }
  const letters = [...byGroup.keys()].sort()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Squads</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {letters.map(g => (
          <section key={g} className="card p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-accent">
              Group {g}
            </div>
            <ul className="space-y-1.5">
              {byGroup.get(g)!.map(t => (
                <li key={t.id}>
                  <Link href={`/squads/${t.code}`}
                        className="flex items-center justify-between rounded p-1 hover:bg-pitch/5">
                    <TeamBadge team={t} size="sm" />
                    <span className="text-xs text-pitch">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
