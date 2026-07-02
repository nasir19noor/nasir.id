import Link from 'next/link'
import {
  api, fmtWIB, type Team, type Prediction, type MatchPrediction, type ScorerPrediction,
} from '@/lib/api'
import TeamBadge from '@/components/TeamBadge'

// Predictions change only once a day or on manual admin trigger. Render on
// every request (no ISR cache) so a fresh trigger shows up immediately rather
// than waiting out a revalidate window.
export const dynamic = 'force-dynamic'

type MatchData  = { predictions: MatchPrediction[] }
type ScorerData = { ranking: ScorerPrediction[]; summary: string }
type ChampionEntry = { rank: number; team: string; win_probability_pct: number; reasoning: string }
type ChampionData  = { champion: string; ranking: ChampionEntry[]; summary: string }

export default async function PredictionsPage() {
  const [matchP, scorerP, championP, teams] = await Promise.all([
    api<Prediction<MatchData>>('/predictions/today', { noStore: true }).catch(() => null),
    api<Prediction<ScorerData>>('/predictions/top-scorer', { noStore: true }).catch(() => null),
    api<Prediction<ChampionData>>('/predictions/champion', { noStore: true }).catch(() => null),
    api<Team[]>('/squads').catch(() => [] as Team[]),
  ])

  const byCode = new Map(teams.map(t => [t.code, t]))
  const team = (code: string): Team =>
    byCode.get(code) ?? { id: -1, code, name: code }

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">
            AI Predictions <span className="text-accent">🔮</span>
          </h1>
          <p className="text-sm text-black/60">
            Generated daily by Claude from FIFA ranking, squad strength, current
            form, venue, and other signals. Predictions are for entertainment.
          </p>
        </div>
        <Link href="/predictions/history"
              className="shrink-0 rounded-lg bg-pitch px-3 py-2 text-sm font-bold text-chalk hover:bg-pitch/90">
          Results &amp; accuracy →
        </Link>
      </header>

      {/* Champion forecast */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Champion forecast <span className="text-accent">🏆</span></h2>
          {championP?.generated_at && (
            <span className="text-xs text-black/40">
              {fmtWIB(championP.generated_at)} · {championP.model}
            </span>
          )}
        </div>
        {!championP || !championP.data?.ranking?.length ? (
          <p className="card p-4 text-sm text-black/60">
            No champion prediction yet — the daily run hasn’t happened, or no results are in.
          </p>
        ) : (
          <>
            {championP.data.champion && (
              <div className="card flex items-center gap-4 p-4">
                <span className="text-4xl">🏆</span>
                <div>
                  <div className="text-xs uppercase tracking-wide text-black/50">Most likely winner</div>
                  <div className="mt-1 text-lg font-bold"><TeamBadge team={team(championP.data.champion)} /></div>
                </div>
              </div>
            )}
            {championP.data.summary && (
              <p className="card p-4 text-sm text-black/70 italic">{championP.data.summary}</p>
            )}
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-pitch/5 text-xs uppercase text-pitch">
                  <tr>
                    <th className="py-2 pl-3 text-left">#</th>
                    <th className="py-2 text-left">Team</th>
                    <th className="py-2 text-left">Win probability</th>
                    <th className="py-2 pr-3 text-left">Why</th>
                  </tr>
                </thead>
                <tbody>
                  {championP.data.ranking.map(c => (
                    <tr key={c.rank} className="border-t border-black/5 align-top">
                      <td className="py-2 pl-3 font-mono text-black/40">{c.rank}</td>
                      <td className="py-2"><TeamBadge team={team(c.team)} size="sm" /></td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded bg-black/10">
                            <div className="h-2 bg-accent" style={{ width: `${c.win_probability_pct}%` }} />
                          </div>
                          <span className="font-mono text-xs">{c.win_probability_pct}%</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-xs text-black/60">{c.reasoning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Match winners */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">
            Upcoming matches
            <span className="ml-2 text-sm font-normal text-black/50">next 24 hours</span>
          </h2>
          {matchP?.generated_at && (
            <span className="text-xs text-black/40">
              {fmtWIB(matchP.generated_at)} · {matchP.model}
            </span>
          )}
        </div>
        {!matchP || !matchP.data?.predictions?.length ? (
          <p className="card p-4 text-sm text-black/60">
            No match predictions available — either no upcoming fixtures or the
            daily run hasn’t happened yet.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {matchP.data.predictions.map(p => (
              <MatchCard key={p.fixture_id} p={p} team={team} />
            ))}
          </div>
        )}
      </section>

      {/* Top scorer forecast */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Golden Boot forecast</h2>
          {scorerP?.generated_at && (
            <span className="text-xs text-black/40">
              {fmtWIB(scorerP.generated_at)} · {scorerP.model}
            </span>
          )}
        </div>
        {!scorerP || !scorerP.data?.ranking?.length ? (
          <p className="card p-4 text-sm text-black/60">
            No top-scorer prediction yet.
          </p>
        ) : (
          <>
            {scorerP.data.summary && (
              <p className="card p-4 text-sm text-black/70 italic">
                {scorerP.data.summary}
              </p>
            )}
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-pitch/5 text-xs uppercase text-pitch">
                  <tr>
                    <th className="py-2 pl-3 text-left">#</th>
                    <th className="py-2 text-left">Player</th>
                    <th className="py-2 text-left">Team</th>
                    <th className="py-2 text-right">Now</th>
                    <th className="py-2 text-right">Proj.</th>
                    <th className="py-2 pr-3 text-left">Why</th>
                  </tr>
                </thead>
                <tbody>
                  {scorerP.data.ranking.map(s => (
                    <tr key={s.rank} className="border-t border-black/5 align-top">
                      <td className="py-2 pl-3 font-mono text-black/40">{s.rank}</td>
                      <td className="py-2 font-medium">{s.player}</td>
                      <td className="py-2"><TeamBadge team={team(s.team)} size="sm" /></td>
                      <td className="py-2 text-right font-mono">{s.current_goals}</td>
                      <td className="py-2 text-right font-mono font-bold text-accent">
                        {s.projected_final_goals}
                      </td>
                      <td className="py-2 pr-3 text-xs text-black/60">{s.reasoning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function MatchCard({ p, team }: { p: MatchPrediction; team: (c: string) => Team }) {
  const home = team(p.home), away = team(p.away)
  const winLabel =
    p.predicted_winner === 'draw' ? 'Draw'
      : p.predicted_winner === p.home ? `${home.code} win`
      : `${away.code} win`
  const conf = p.confidence?.toLowerCase()
  const confColor = conf === 'high' ? 'bg-green-600'
    : conf === 'low' ? 'bg-black/40' : 'bg-amber-500'

  return (
    <article className="card p-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="text-right"><TeamBadge team={home} /></div>
        <div className="rounded bg-pitch px-3 py-1 text-center font-mono text-sm font-bold text-chalk">
          {p.likely_score}
        </div>
        <div><TeamBadge team={away} /></div>
      </div>

      {/* Probability bar */}
      <div className="mt-3 flex h-2 overflow-hidden rounded">
        <div className="bg-pitch"   style={{ width: `${p.home_win_pct}%` }} title={`${home.code} ${p.home_win_pct}%`} />
        <div className="bg-black/20" style={{ width: `${p.draw_pct}%` }}     title={`Draw ${p.draw_pct}%`} />
        <div className="bg-accent"  style={{ width: `${p.away_win_pct}%` }} title={`${away.code} ${p.away_win_pct}%`} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-black/50">
        <span>{home.code} {p.home_win_pct}%</span>
        <span>Draw {p.draw_pct}%</span>
        <span>{away.code} {p.away_win_pct}%</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="rounded bg-pitch/10 px-2 py-0.5 text-xs font-bold text-pitch">
          {winLabel}
        </span>
        <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase text-white ${confColor}`}>
          {p.confidence} conf.
        </span>
      </div>
      <p className="mt-2 text-xs text-black/60">{p.reasoning}</p>
    </article>
  )
}
