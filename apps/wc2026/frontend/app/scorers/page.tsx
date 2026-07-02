import { api, type Scorer } from '@/lib/api'
import TeamBadge from '@/components/TeamBadge'

// Scorer goals change live during matches, so render on every request with an
// uncached fetch — updates show immediately instead of waiting out a 5-min cache.
export const dynamic = 'force-dynamic'

export default async function ScorersPage() {
  const scorers = await api<Scorer[]>('/scorers?limit=50', { noStore: true }).catch(() => [] as Scorer[])
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">
        Golden Boot Race <span className="text-accent">⚽</span>
      </h1>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[18rem] text-sm">
          <thead className="bg-pitch/5 text-xs uppercase tracking-wide text-pitch">
            <tr>
              <th className="py-2 pl-3 text-left">#</th>
              <th className="py-2 text-left">Player</th>
              <th className="py-2 text-left">Country</th>
              <th className="hidden py-2 text-left sm:table-cell">Club</th>
              <th className="py-2 pr-3 text-right">Goals</th>
            </tr>
          </thead>
          <tbody>
            {scorers.map(s => (
              <tr key={s.rank} className="border-t border-black/5">
                <td className="py-2 pl-3 font-mono text-black/40">{s.rank}</td>
                <td className="py-2 font-medium">{s.player}</td>
                <td className="py-2"><TeamBadge team={s.team} size="sm" /></td>
                <td className="hidden py-2 text-black/60 sm:table-cell">{s.club ?? '—'}</td>
                <td className="py-2 pr-3 text-right font-bold">{s.goals}</td>
              </tr>
            ))}
            {scorers.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-black/60">
                No goals scored yet — check back after kickoff.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
