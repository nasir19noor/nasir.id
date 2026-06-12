import type { Fixture } from '@/lib/api'
import TeamBadge from './TeamBadge'

function statusBadge(status: Fixture['status']) {
  if (status === 'live')     return <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Live</span>
  if (status === 'finished') return <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">FT</span>
  return null
}

function fmtKickoff(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function FixturesList({ fixtures }: { fixtures: Fixture[] }) {
  if (!fixtures.length) {
    return <p className="p-4 text-sm text-black/60">No fixtures.</p>
  }
  return (
    <ul className="divide-y divide-black/5">
      {fixtures.map(f => {
        const played = f.home_score != null && f.away_score != null
        return (
          <li key={f.id}
              className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="hidden w-32 shrink-0 text-xs text-black/50 sm:block">
              {fmtKickoff(f.kickoff)}
            </span>
            <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="text-right"><TeamBadge team={f.home} /></div>
              <div className="rounded bg-pitch px-3 py-1 text-center font-mono text-base font-bold text-chalk">
                {played ? `${f.home_score} - ${f.away_score}` : 'vs'}
              </div>
              <div><TeamBadge team={f.away} /></div>
            </div>
            <div className="w-14 shrink-0 text-right">
              {statusBadge(f.status)}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
