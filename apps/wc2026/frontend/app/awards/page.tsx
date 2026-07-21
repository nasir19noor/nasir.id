import { api, type AwardsData } from '@/lib/api'
import TeamBadge from '@/components/TeamBadge'

// Tournament is complete — data is final. Cache lightly.
export const revalidate = 3600

const MEDAL = ['🥇', '🥈', '🥉', '🏅']
const PLACE = ['Champion', 'Runner-up', 'Third place', 'Fourth place']

export default async function AwardsPage() {
  const data = await api<AwardsData>('/awards').catch(() => null)
  if (!data) {
    return <p className="text-black/60">Awards are not available right now.</p>
  }
  const { standings, awards, stats, top_scorers, top_scoring_teams } = data
  const podium = [standings.champion, standings.runner_up, standings.third, standings.fourth]

  return (
    <div className="space-y-8">
      {/* Champion hero */}
      <section className="card overflow-hidden">
        <div className="bg-pitch p-8 text-center text-chalk sm:p-12">
          <p className="text-xs uppercase tracking-[0.3em] opacity-80">World Champions</p>
          <div className="mt-4 flex flex-col items-center gap-3">
            <div className="text-6xl">🏆</div>
            <TeamBadge team={standings.champion} size="lg" showName={false} />
            <h1 className="text-4xl font-extrabold sm:text-5xl">{standings.champion.name}</h1>
          </div>
          <p className="mt-3 text-sm opacity-80">
            FIFA World Cup 2026 · defeated {standings.runner_up.name} in the final
          </p>
        </div>
      </section>

      {/* Individual awards */}
      <section>
        <h2 className="mb-3 text-xl font-extrabold">Individual Awards</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {awards.map(a => (
            <div key={a.award} className="card p-5">
              <div className="flex items-start gap-4">
                <div className="text-4xl leading-none">{a.emoji ?? '🏅'}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-extrabold text-pitch">{a.award}</h3>
                    {a.goals != null && a.goals > 0 && (
                      <span className="shrink-0 rounded bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
                        {a.goals} goals
                      </span>
                    )}
                  </div>
                  <p className="text-xs uppercase tracking-wide text-black/50">{a.subtitle}</p>
                  <p className="mt-2 text-lg font-bold">{a.player}</p>
                  <div className="mt-1"><TeamBadge team={a.team} size="sm" /></div>
                  <p className="mt-1 text-xs text-black/60">
                    {[a.position, a.club, a.age ? `age ${a.age}` : null].filter(Boolean).join(' · ')}
                  </p>
                  <p className="mt-2 text-sm text-black/70">{a.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final standings */}
      <section>
        <h2 className="mb-3 text-xl font-extrabold">Final Standings</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {podium.map((t, i) => (
            <div key={i} className={`card p-4 text-center ${i === 0 ? 'ring-2 ring-accent' : ''}`}>
              <div className="text-3xl">{MEDAL[i]}</div>
              <p className="mt-1 text-xs uppercase tracking-wide text-black/50">{PLACE[i]}</p>
              <div className="mt-2 flex justify-center">
                <TeamBadge team={t} size="md" showName={false} />
              </div>
              <p className="mt-1 font-bold">{t.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Statistics */}
      <section>
        <h2 className="mb-3 text-xl font-extrabold">Tournament Statistics</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Matches" value={stats.matches} />
          <Stat label="Total goals" value={stats.goals} />
          <Stat label="Goals / match" value={stats.goals_per_match.toFixed(2)} />
          <Stat label="Goalscorers" value={stats.scorers} />
          <Stat label="Teams" value={stats.teams} />
          <Stat label="Players" value={stats.players} />
          <Stat label="Biggest margin" value={`+${stats.biggest_margin}`} />
          <Stat label="Most goals in a match" value={stats.highest_scoring} />
        </div>
      </section>

      {/* Golden Boot race + top scoring teams */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-xl font-extrabold">
            Golden Boot Race <span className="text-accent">👟</span>
          </h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-pitch/5 text-xs uppercase tracking-wide text-pitch">
                <tr>
                  <th className="py-2 pl-3 text-left">#</th>
                  <th className="py-2 text-left">Player</th>
                  <th className="py-2 text-left">Country</th>
                  <th className="py-2 pr-3 text-right">Goals</th>
                </tr>
              </thead>
              <tbody>
                {top_scorers.map(s => (
                  <tr key={s.rank} className="border-t border-black/5">
                    <td className="py-2 pl-3 font-mono text-black/40">{s.rank}</td>
                    <td className="py-2 font-medium">{s.player}</td>
                    <td className="py-2"><TeamBadge team={s.team} size="sm" showName={false} /></td>
                    <td className="py-2 pr-3 text-right font-bold">{s.goals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-extrabold">
            Top Scoring Teams <span className="text-accent">⚽</span>
          </h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-pitch/5 text-xs uppercase tracking-wide text-pitch">
                <tr>
                  <th className="py-2 pl-3 text-left">#</th>
                  <th className="py-2 text-left">Team</th>
                  <th className="py-2 pr-3 text-right">Goals</th>
                </tr>
              </thead>
              <tbody>
                {top_scoring_teams.map((r, i) => (
                  <tr key={r.team.code} className="border-t border-black/5">
                    <td className="py-2 pl-3 font-mono text-black/40">{i + 1}</td>
                    <td className="py-2"><TeamBadge team={r.team} size="sm" /></td>
                    <td className="py-2 pr-3 text-right font-bold">{r.goals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl font-extrabold text-pitch">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-black/50">{label}</div>
    </div>
  )
}
