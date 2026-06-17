import { notFound } from 'next/navigation'
import { api, type Group } from '@/lib/api'
import StandingsTable from '@/components/StandingsTable'
import FixturesList from '@/components/FixturesList'

// Standings and fixtures change live during matches, so render on every
// request (no ISR cache) with an uncached fetch — results show up immediately
// rather than waiting out a revalidate window.
export const dynamic = 'force-dynamic'

export default async function GroupPage(
  { params }: { params: Promise<{ letter: string }> },
) {
  const { letter } = await params
  let group: Group
  try {
    group = await api<Group>(`/groups/${letter.toUpperCase()}`, { noStore: true })
  } catch {
    notFound()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">
        Group <span className="text-accent">{group.letter}</span>
      </h1>
      <div className="card overflow-hidden">
        <StandingsTable rows={group.standings} />
      </div>
      <div className="card">
        <FixturesList fixtures={group.fixtures} />
      </div>
    </div>
  )
}
