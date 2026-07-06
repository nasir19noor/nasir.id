import { highlightsUrl, type Bracket, type Knockout, type Team } from '@/lib/api'

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
  const url = highlightsUrl(m.home, m.away)
  const box = (
    <div className={`relative w-36 overflow-hidden rounded-md border border-black/15 bg-white text-[11px] shadow-sm${
      url ? ' transition group-hover:ring-2 group-hover:ring-red-500/40' : ''}`}>
      <Side team={m.home} label={m.home_label}
            score={showScore ? m.home_score : null}
            shootout={showScore ? m.home_shootout : null} winner={homeWin} />
      <div className="border-t border-black/10" />
      <Side team={m.away} label={m.away_label}
            score={showScore ? m.away_score : null}
            shootout={showScore ? m.away_shootout : null} winner={awayWin} />
      {url && (
        // Centred on the divider, in the empty band between the team labels and
        // scores — absolute so it never changes the cell height (keeps the
        // bracket connectors aligned).
        <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-[15px] w-[15px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#FF0000] shadow-sm ring-1 ring-black/5">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true">
            <path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51A3.02 3.02 0 0 0 23.5 17.8 31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.25 3.6-6.25 3.6Z" />
          </svg>
        </span>
      )}
    </div>
  )
  if (!url) return box
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
       title="Watch highlights on YouTube (FolaPlay)"
       aria-label="Watch highlights on YouTube"
       className="group block w-36">
      {box}
    </a>
  )
}

// Bracket connectors. Each match fills an equal vertical slice (flex-1), so a
// cell's centre lines up exactly with the midpoint of the two cells that feed
// it. Connector lines are drawn with percentage offsets inside that slice, so
// they stay aligned no matter how many matches a round has. The 15px stubs are
// half the inter-column gap, so a round's outgoing stub meets the next round's
// incoming stub in the middle.
const LINE = 'bg-black/20'

function MatchNode({ m, side, feeds, receives, pair }: {
  m: Knockout
  side: 'left' | 'right'
  feeds: boolean
  receives: boolean
  pair: 'top' | 'bottom' | 'lone'
}) {
  // The side facing the final is where a match sends its connector.
  const offInner = side === 'left' ? '-right-[15px]' : '-left-[15px]'
  const offOuter = side === 'left' ? '-left-[15px]'  : '-right-[15px]'
  return (
    <div className="relative flex w-36 flex-1 items-center">
      {receives && (
        <span className={`absolute top-1/2 h-px w-[15px] ${LINE} ${offOuter}`} />
      )}
      <Cell m={m} />
      {feeds && (
        <>
          <span className={`absolute top-1/2 h-px w-[15px] ${LINE} ${offInner}`} />
          {pair !== 'lone' && (
            <span className={`absolute w-px ${LINE} ${offInner} ${
              pair === 'top' ? 'top-1/2 h-1/2' : 'bottom-1/2 h-1/2'}`} />
          )}
        </>
      )}
    </div>
  )
}

function Column({ title, matches, side, feeds, receives }: {
  title: string
  matches: Knockout[]
  side: 'left' | 'right'
  feeds: boolean
  receives: boolean
}) {
  if (!matches.length) return null
  const lone = matches.length === 1
  return (
    <div className="flex flex-col">
      <div className="mb-2 text-center text-[9px] font-bold uppercase tracking-wide text-pitch">
        {title}
      </div>
      <div className="flex flex-1 flex-col">
        {matches.map((m, i) => (
          <MatchNode key={m.id} m={m} side={side} feeds={feeds} receives={receives}
                     pair={lone ? 'lone' : (i % 2 === 0 ? 'top' : 'bottom')} />
        ))}
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
      <div className="flex min-w-[70rem] items-stretch gap-[30px]">
        <Column title={ROUND_TITLE.r32} matches={r32L} side="left" receives={false} feeds />
        <Column title={ROUND_TITLE.r16} matches={r16L} side="left" receives feeds />
        <Column title={ROUND_TITLE.qf}  matches={qfL} side="left" receives feeds />
        <Column title={ROUND_TITLE.sf}  matches={sfL} side="left" receives feeds />

        {/* Centre: Final is centred to line up with the semi-finals so the
            connectors meet; Third place hangs below without shifting it. */}
        <div className="flex flex-col">
          <div className="mb-2 text-center text-[9px] font-extrabold uppercase tracking-wide text-accent">
            Final
          </div>
          <div className="relative flex flex-1 items-center justify-center">
            <div className="relative scale-105">
              <span className={`absolute top-1/2 h-px w-[15px] ${LINE} -left-[15px]`} />
              <span className={`absolute top-1/2 h-px w-[15px] ${LINE} -right-[15px]`} />
              {finalMatch
                ? <Cell m={finalMatch} />
                : <div className="w-36 rounded-md border border-black/15 bg-white py-3 text-center text-[10px] italic text-black/40">
                    TBD
                  </div>}
            </div>
            {thirdMatch && (
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
                <div className="mb-1 text-center text-[9px] font-bold uppercase tracking-wide text-black/50">
                  Third place
                </div>
                <Cell m={thirdMatch} />
              </div>
            )}
          </div>
        </div>

        <Column title={ROUND_TITLE.sf}  matches={sfR} side="right" receives feeds />
        <Column title={ROUND_TITLE.qf}  matches={qfR} side="right" receives feeds />
        <Column title={ROUND_TITLE.r16} matches={r16R} side="right" receives feeds />
        <Column title={ROUND_TITLE.r32} matches={r32R} side="right" receives={false} feeds />
      </div>
    </div>
  )
}
