import { notFound } from 'next/navigation'
import { api, type Squad } from '@/lib/api'
import TeamBadge from '@/components/TeamBadge'

export const revalidate = 600

const POS_LABEL: Record<string, string> = {
  GK: 'Goalkeepers', DF: 'Defenders', MF: 'Midfielders', FW: 'Forwards',
}

export default async function SquadPage(
  { params }: { params: Promise<{ teamCode: string }> },
) {
  const { teamCode } = await params
  let squad: Squad
  try {
    squad = await api<Squad>(`/squads/${teamCode.toUpperCase()}`)
  } catch {
    notFound()
  }

  const buckets: Record<string, typeof squad.players> = { GK: [], DF: [], MF: [], FW: [] }
  for (const p of squad.players) {
    const k = p.position || 'FW'
    ;(buckets[k] ?? buckets.FW).push(p)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase text-black/50">Squad</div>
          <h1 className="text-2xl font-extrabold">
            <TeamBadge team={squad.team} size="lg" />
          </h1>
        </div>
        <div className="text-sm text-black/60">
          {squad.players.length} players
        </div>
      </div>

      {(['GK', 'DF', 'MF', 'FW'] as const).map(pos => buckets[pos].length ? (
        <section key={pos}>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-pitch">
            {POS_LABEL[pos]}
          </h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-pitch/5 text-xs uppercase text-pitch">
                <tr>
                  <th className="py-2 pl-3 text-left">#</th>
                  <th className="py-2 text-left">Player</th>
                  <th className="py-2 text-left">Club</th>
                  <th className="py-2 text-right">Age</th>
                  <th className="py-2 text-right">Caps</th>
                  <th className="py-2 pr-3 text-right">Goals</th>
                </tr>
              </thead>
              <tbody>
                {buckets[pos].map(p => (
                  <tr key={p.id} className="border-t border-black/5">
                    <td className="py-2 pl-3 font-mono text-xs text-black/40">
                      {p.jersey_number ?? '-'}
                    </td>
                    <td className="py-2 font-medium">
                      {p.name}
                      {p.is_captain && (
                        <span className="ml-1 rounded bg-accent px-1 text-[10px] font-bold text-pitch">
                          C
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-black/60">{p.club ?? '—'}</td>
                    <td className="py-2 text-right">{p.age ?? '—'}</td>
                    <td className="py-2 text-right">{p.caps}</td>
                    <td className="py-2 pr-3 text-right">
                      <span className="font-medium">{p.intl_goals}</span>
                      {p.wc_goals > 0 && (
                        <span className="ml-1 text-xs font-bold text-accent">
                          (+{p.wc_goals})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null)}
    </div>
  )
}
