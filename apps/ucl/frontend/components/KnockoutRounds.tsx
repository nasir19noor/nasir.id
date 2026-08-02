import { type Round, type Tie, fmtWIB } from '@/lib/api'
import TeamBadge from './TeamBadge'

function TieCard({ tie }: { tie: Tie }) {
  const hasAgg = tie.agg_a != null && tie.agg_b != null
  const final = tie.legs[0]?.round_code === 'final'
  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1.5">
          <TeamRow team={tie.team_a} agg={tie.agg_a} winner={tie.winner?.id === tie.team_a.id} />
          <TeamRow team={tie.team_b} agg={tie.agg_b} winner={tie.winner?.id === tie.team_b.id} />
        </div>
        {hasAgg && !final && (
          <span className="shrink-0 text-[10px] uppercase tracking-wide text-black/40">
            agg
          </span>
        )}
      </div>
      <ul className="space-y-0.5 border-t border-black/5 pt-2 text-xs text-black/60">
        {tie.legs.map((leg, i) => {
          const played = leg.home_score != null && leg.away_score != null
          const pens = leg.home_shootout != null && leg.away_shootout != null
          return (
            <li key={leg.id} className="flex justify-between gap-2">
              <span>{final ? 'Final' : `Leg ${i + 1}`} · {fmtWIB(leg.kickoff)}</span>
              <span className="font-mono font-semibold text-black/80">
                {played ? `${leg.home_score}-${leg.away_score}` : '—'}
                {pens && ` (${leg.home_shootout}-${leg.away_shootout} pens)`}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function TeamRow({ team, agg, winner }: {
  team: Tie['team_a']; agg?: number | null; winner: boolean
}) {
  return (
    <span className={`flex items-center gap-2 text-sm ${winner ? 'font-bold' : ''}`}>
      {agg != null && (
        <span className="w-5 text-right font-mono font-bold">{agg}</span>
      )}
      <TeamBadge team={team} size="sm" />
      {winner && <span className="text-[10px] text-accent">●</span>}
    </span>
  )
}

export default function KnockoutRounds({ rounds }: { rounds: Round[] }) {
  if (!rounds.length) {
    return (
      <p className="p-4 text-sm text-black/60">
        The knockout phase hasn&apos;t started yet — play-off ties are drawn
        after league-phase matchday 8.
      </p>
    )
  }
  return (
    <div className="space-y-8">
      {rounds.map(r => (
        <section key={r.round_code}>
          <h2 className="mb-3 text-lg font-bold">{r.label}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {r.ties.map((t, i) => <TieCard key={i} tie={t} />)}
          </div>
        </section>
      ))}
    </div>
  )
}
