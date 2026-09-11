import { type Fixture, type MatchEvent, fmtWIB } from '@/lib/api'
import TeamBadge from './TeamBadge'

function statusBadge(status: Fixture['status']) {
  if (status === 'live')     return <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Live</span>
  if (status === 'finished') return <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">FT</span>
  return null
}

// YouTube's own mark: red rounded body with the play triangle knocked out in
// white. Drawn as two paths rather than one so the triangle stays white
// instead of showing the row behind it.
function HighlightsLink({ url, match }: { url: string; match: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
       title={`Watch highlights: ${match}`}
       aria-label={`Watch highlights: ${match}`}
       className="group flex h-7 w-7 shrink-0 items-center justify-center rounded-lg
                  text-[#FF0000] outline-none transition duration-150
                  hover:bg-[#FF0000]/10 hover:scale-110
                  focus-visible:ring-2 focus-visible:ring-[#FF0000]/50 active:scale-95">
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] drop-shadow-sm" aria-hidden="true">
        <path fill="currentColor"
              d="M21.6 7.2a2.5 2.5 0 0 0-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.83.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.83-.43a2.5 2.5 0 0 0 1.77-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8Z" />
        <path fill="#fff" d="M10 15.5v-7l6 3.5-6 3.5Z" />
      </svg>
    </a>
  )
}

function EventIcon({ kind }: { kind: MatchEvent['kind'] }) {
  if (kind === 'goal') {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-night" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" fill="currentColor" />
        <path fill="#fff" d="m12 6.6 3.2 2.3-1.2 3.8h-4L8.8 8.9 12 6.6Z" />
      </svg>
    )
  }
  // Cards: a small rectangle in the matching colour.
  return (
    <span aria-hidden="true"
          className={`inline-block h-[14px] w-[10px] rounded-[2px] ${
            kind === 'red' ? 'bg-red-600' : 'bg-amber-400'
          }`} />
  )
}

const EVENT_LABEL: Record<MatchEvent['kind'], string> = {
  goal: 'Goal', yellow: 'Yellow card', red: 'Red card',
}

/** One line of the timeline, pushed to the side of the team it belongs to. */
function EventRow({ ev, home }: { ev: MatchEvent; home: boolean }) {
  const body = (
    <span className={`flex min-w-0 items-center gap-1.5 ${home ? 'flex-row-reverse text-right' : ''}`}>
      <EventIcon kind={ev.kind} />
      <span className="truncate">
        {ev.player ?? EVENT_LABEL[ev.kind]}
        {ev.note && <span className="text-black/50"> ({ev.note})</span>}
      </span>
    </span>
  )
  return (
    <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-0.5 text-xs">
      <span className="flex min-w-0 justify-end">{home ? body : null}</span>
      <span className="w-12 shrink-0 text-center font-mono text-[11px] text-black/50">
        {ev.minute ?? ''}
      </span>
      <span className="flex min-w-0">{home ? null : body}</span>
    </li>
  )
}

function MatchDetail({ f }: { f: Fixture }) {
  const events = f.events ?? []
  return (
    <div className="border-t border-black/5 bg-black/[0.02] px-4 py-3">
      <ul className="mx-auto max-w-2xl">
        {events.map((ev, i) => (
          <EventRow key={i} ev={ev} home={ev.team_id === f.home.id} />
        ))}
      </ul>
      <p className="mt-2 text-center text-[11px] text-black/45">
        {[f.venue, f.attendance ? `${f.attendance.toLocaleString('en-GB')} attendance` : null]
          .filter(Boolean).join(' · ')}
      </p>
    </div>
  )
}

export default function FixturesList({ fixtures }: { fixtures: Fixture[] }) {
  if (!fixtures.length) {
    return <p className="p-4 text-sm text-black/60">No fixtures.</p>
  }
  return (
    <ul className="divide-y divide-black/5">
      {fixtures.map(f => {
        const played = f.home_score != null && f.away_score != null
        const label = `${f.home.name} vs ${f.away.name}`
        const hasDetail = (f.events?.length ?? 0) > 0

        const row = (
          <div className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="hidden w-32 shrink-0 text-xs text-black/50 sm:block">
              {f.kickoff ? fmtWIB(f.kickoff) : ''}
            </span>
            <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="flex justify-end text-right"><TeamBadge team={f.home} /></div>
              <div className="rounded bg-night px-3 py-1 text-center font-mono text-base font-bold text-chalk">
                {played ? `${f.home_score} - ${f.away_score}` : 'vs'}
              </div>
              <div><TeamBadge team={f.away} /></div>
            </div>
            <div className="flex w-24 shrink-0 items-center justify-end gap-1.5">
              {statusBadge(f.status)}
              {f.video_url && <HighlightsLink url={f.video_url} match={label} />}
              {hasDetail && (
                <svg viewBox="0 0 24 24"
                     className="h-4 w-4 text-black/35 transition-transform duration-200
                                group-open/match:rotate-180"
                     fill="none" stroke="currentColor" strokeWidth="2.5"
                     strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              )}
            </div>
          </div>
        )

        // Matches with goals or cards cascade open to a timeline. <details>
        // does this natively, so the list stays a server component with no
        // client-side JavaScript.
        return (
          <li key={f.id}>
            {hasDetail ? (
              <details className="group/match">
                <summary className="cursor-pointer list-none hover:bg-black/[0.02]
                                    [&::-webkit-details-marker]:hidden">
                  {row}
                </summary>
                <MatchDetail f={f} />
              </details>
            ) : row}
          </li>
        )
      })}
    </ul>
  )
}
