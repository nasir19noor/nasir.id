import { type Fixture, fmtWIB } from '@/lib/api'
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

export default function FixturesList({ fixtures }: { fixtures: Fixture[] }) {
  if (!fixtures.length) {
    return <p className="p-4 text-sm text-black/60">No fixtures.</p>
  }
  return (
    <ul className="divide-y divide-black/5">
      {fixtures.map(f => {
        const played = f.home_score != null && f.away_score != null
        const label = `${f.home.name} vs ${f.away.name}`
        return (
          <li key={f.id}
              className="flex items-center gap-3 px-4 py-3 text-sm">
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
            <div className="flex w-20 shrink-0 items-center justify-end gap-1.5">
              {statusBadge(f.status)}
              {f.video_url && <HighlightsLink url={f.video_url} match={label} />}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
