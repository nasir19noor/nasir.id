import type { Bracket, Knockout, Team } from '@/lib/api'

/**
 * Symmetric tournament bracket rendered from live /knockout data.
 *
 * Layout (left → centre → right), like a printed wall chart:
 *   LAST 32 · LAST 16 · QF · SF ·  FINAL  · SF · QF · LAST 16 · LAST 32
 *
 * Each round's matches are split in half: the first half feeds the left
 * side, the second half the right side. The final (and third-place match)
 * sit in the centre column. Everything is data-driven — empty slots show
 * "TBD" until ESPN reports the qualified teams.
 */

const ROUND_TITLE: Record<Knockout['round_code'], string> = {
  r32: 'Last 32', r16: 'Last 16', qf: 'Quarter-finals',
  sf: 'Semi-finals', third: 'Third place', final: 'Final',
}

function flagUrl(t: Team) {
  return t.iso2 ? `https://flagcdn.com/w40/${t.iso2}.png` : null
}

function Side({ team, label, score, shootout, winner }: {
  team?: Team | null; label?: string | null
  score?: number | null; shootout?: number | null; winner: boolean
}) {
  const url = team ? flagUrl(team) : null
  return (
    <div className={`flex items-center justify-between gap-1 px-1.5 py-1
                     ${winner ? 'bg-accent/15 font-bold' : ''}`}>
      <span className="flex min-w-0 items-center gap-1">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={team!.name} width={16} height={12}
               className="rounded-[1px] ring-1 ring-black/10" />
        ) : (
          <span className="inline-block h-3 w-4 rounded-[1px] bg-black/10" />
        )}
        {team ? (
          <span className="truncate font-semibold">{team.code}</span>
        ) : (
          <span className="truncate italic text-black/40">
            {label && !label.startsWith('TBD') ? label : 'TBD'}
          </span>
        )}
      </span>
      <span className="shrink-0 font-mono tabular-nums">
        {score ?? ''}
        {shootout != null && (
          <span className="ml-0.5 text-accent" title="penalty shootout">({shootout})</span>
        )}
      </span>
    </div>
  )
}

function Cell({ m }: { m: Knockout }) {
  const homeWin = !!(m.winner && m.home && m.winner.id === m.home.id)
  const awayWin = !!(m.winner && m.away && m.winner.id === m.away.id)
  const showScore = m.status === 'live' || m.status === 'finished'
  return (
    <div className="w-36 overflow-hidden rounded-md border border-black/15 bg-white text-[11px] shadow-sm">
      <Side team={m.home} label={m.home_label}
            score={showScore ? m.home_score : null}
            shootout={showScore ? m.home_shootout : null} winner={homeWin} />
      <div className="border-t border-black/10" />
      <Side team={m.away} label={m.away_label}
            score={showScore ? m.away_score : null}
            shootout={showScore ? m.away_shootout : null} winner={awayWin} />
    </div>
  )
}

function Column({ title, matches }: { title: string; matches: Knockout[] }) {
  if (!matches.length) return null
  return (
    <div className="flex min-w-[9.5rem] flex-col">
      <div className="mb-2 text-center text-[9px] font-bold uppercase tracking-wide text-pitch">
        {title}
      </div>
      <div className="flex flex-1 flex-col justify-around gap-3">
        {matches.map(m => <Cell key={m.id} m={m} />)}
      </div>
    </div>
  )
}

function half<T>(arr: T[] = []): [T[], T[]] {
  const mid = Math.ceil(arr.length / 2)
  return [arr.slice(0, mid), arr.slice(mid)]
}

export default function KnockoutBracket({ bracket }: { bracket: Bracket[] }) {
  const byRound: Partial<Record<Knockout['round_code'], Knockout[]>> =
    Object.fromEntries(bracket.map(b => [b.round_code, b.matches]))

  if (!bracket.length) {
    return (
      <p className="text-sm text-black/50">
        The knockout bracket appears once the group stage is drawn.
      </p>
    )
  }

  const [r32L, r32R] = half(byRound.r32)
  const [r16L, r16R] = half(byRound.r16)
  const [qfL,  qfR]  = half(byRound.qf)
  const [sfL,  sfR]  = half(byRound.sf)
  const finalMatch   = byRound.final?.[0]
  const thirdMatch   = byRound.third?.[0]

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-[64rem] items-stretch gap-3">
        <Column title={ROUND_TITLE.r32} matches={r32L} />
        <Column title={ROUND_TITLE.r16} matches={r16L} />
        <Column title={ROUND_TITLE.qf}  matches={qfL} />
        <Column title={ROUND_TITLE.sf}  matches={sfL} />

        {/* Centre: Final + Third place */}
        <div className="flex min-w-[10rem] flex-col justify-center gap-4">
          <div>
            <div className="mb-2 text-center text-xs font-extrabold uppercase tracking-wide text-accent">
              Final
            </div>
            {finalMatch
              ? <div className="scale-105"><Cell m={finalMatch} /></div>
              : <p className="text-center text-[10px] text-black/40">TBD</p>}
          </div>
          {thirdMatch && (
            <div>
              <div className="mb-1 text-center text-[9px] font-bold uppercase tracking-wide text-black/50">
                Third place
              </div>
              <Cell m={thirdMatch} />
            </div>
          )}
        </div>

        <Column title={ROUND_TITLE.sf}  matches={sfR} />
        <Column title={ROUND_TITLE.qf}  matches={qfR} />
        <Column title={ROUND_TITLE.r16} matches={r16R} />
        <Column title={ROUND_TITLE.r32} matches={r32R} />
      </div>
    </div>
  )
}
