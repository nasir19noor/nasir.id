import { api, type Bracket, type Knockout } from '@/lib/api'
import TeamBadge from '@/components/TeamBadge'

export const revalidate = 300

const ROUND_LABEL: Record<Knockout['round_code'], string> = {
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf:  'Quarter-finals',
  sf:  'Semi-finals',
  third: 'Third-place play-off',
  final: 'Final',
}

export default async function KnockoutPage() {
  const bracket = await api<Bracket[]>('/knockout').catch(() => [] as Bracket[])
  if (!bracket.length) {
    return <p className="text-sm text-black/60">Knockout bracket will appear here once seeded.</p>
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold">Knockout Bracket</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        {bracket.map(r => (
          <section key={r.round_code} className="space-y-3">
            <h2 className="text-lg font-bold">{ROUND_LABEL[r.round_code]}</h2>
            <ul className="space-y-2">
              {r.matches.map(m => <MatchCard key={m.id} m={m} />)}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

function MatchCard({ m }: { m: Knockout }) {
  return (
    <li className="card flex items-center gap-3 p-3 text-sm">
      <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="text-right">
          {m.home ? <TeamBadge team={m.home} /> :
            <span className="text-xs italic text-black/50">{m.home_label}</span>}
        </div>
        <div className="rounded bg-pitch px-2 py-1 text-center font-mono font-bold text-chalk">
          {m.home_score != null && m.away_score != null
            ? `${m.home_score} - ${m.away_score}` : 'vs'}
        </div>
        <div>
          {m.away ? <TeamBadge team={m.away} /> :
            <span className="text-xs italic text-black/50">{m.away_label}</span>}
        </div>
      </div>
      {m.winner && (
        <span className="hidden text-xs font-bold text-accent sm:inline">
          → {m.winner.code}
        </span>
      )}
    </li>
  )
}
