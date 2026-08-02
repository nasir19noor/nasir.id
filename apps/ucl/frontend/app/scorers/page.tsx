import { api, type Scorer } from '@/lib/api'
import TeamBadge from '@/components/TeamBadge'

export const revalidate = 300

export default async function ScorersPage() {
  const scorers = await api<Scorer[]>('/scorers?limit=50').catch(() => [] as Scorer[])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Top Scorers</h1>
      <div className="card overflow-hidden">
        {scorers.length === 0 ? (
          <p className="p-4 text-sm text-black/60">
            No goals recorded yet — the race starts with matchday 1.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-night/5 text-xs uppercase tracking-wide text-night">
              <tr>
                <th className="py-2 pl-3 text-left">#</th>
                <th className="py-2 text-left">Player</th>
                <th className="py-2 text-left">Club</th>
                <th className="py-2 pr-3 text-right">Goals</th>
              </tr>
            </thead>
            <tbody>
              {scorers.map(s => (
                <tr key={s.rank} className="border-t border-black/5">
                  <td className="py-2 pl-3 font-mono text-xs text-black/40">{s.rank}</td>
                  <td className="py-2 font-medium">{s.player}</td>
                  <td className="py-2"><TeamBadge team={s.team} size="sm" /></td>
                  <td className="py-2 pr-3 text-right font-mono font-bold">{s.goals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
