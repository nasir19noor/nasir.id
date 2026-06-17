import { api, type Group } from '@/lib/api'
import StandingsTable from '@/components/StandingsTable'
import FixturesList from '@/components/FixturesList'

// Standings and fixtures change live during matches, so render on every
// request (no ISR cache) with an uncached fetch — results show up immediately
// rather than waiting out a revalidate window.
export const dynamic = 'force-dynamic'

export default async function GroupsPage() {
  const groups = await api<Group[]>('/groups', { noStore: true }).catch(() => [] as Group[])
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold">Groups</h1>
      {groups.map(g => (
        <section key={g.letter} className="space-y-3">
          <h2 className="text-lg font-bold">
            Group <span className="text-accent">{g.letter}</span>
          </h2>
          <div className="card overflow-hidden">
            <StandingsTable rows={g.standings} />
          </div>
          <div className="card">
            <FixturesList fixtures={g.fixtures} />
          </div>
        </section>
      ))}
    </div>
  )
}
