import { api, type PlayerStats, type MatchStats, type PlayerStat } from '@/lib/api'
import TeamBadge from '@/components/TeamBadge'
import PlayerStatsTable from '@/components/PlayerStatsTable'

export const revalidate = 3600

export default async function StatisticsPage() {
  const [pl, mt] = await Promise.all([
    api<PlayerStats>('/statistics/players').catch(() => null),
    api<MatchStats>('/statistics/matches').catch(() => null),
  ])

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-extrabold">Statistics <span className="text-accent">📊</span></h1>

      {/* ══ Player statistics ══ */}
      {pl && (
        <section className="space-y-5">
          <h2 className="text-xl font-extrabold">Player Statistics</h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Players" value={pl.summary.players} />
            <Stat label="Goals" value={pl.summary.goals} />
            <Stat label="Assists" value={pl.summary.assists} />
            <Stat label="Goalscorers" value={pl.summary.scorers} />
            <Stat label="Yellow / Red" value={`${pl.summary.yellow_cards} / ${pl.summary.red_cards}`} />
            <Stat label="Average age" value={pl.summary.avg_age} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Leaderboard title="Top Scorers (WC goals)" emoji="👟"
                         rows={pl.leaderboards.top_scorers} metric={p => p.goals} />
            <Leaderboard title="Top Assists" emoji="🅰️"
                         rows={pl.leaderboards.top_assists} metric={p => p.assists} />
            <Leaderboard title="Most Booked (cards)" emoji="🟨"
                         rows={pl.leaderboards.most_cards}
                         metric={p => `${p.yellow_cards}🟨${p.red_cards ? ` ${p.red_cards}🟥` : ''}`} />
            <Leaderboard title="Most Experienced (caps)" emoji="🎖️"
                         rows={pl.leaderboards.most_caps} metric={p => p.caps} />
            <Leaderboard title="Most International Goals" emoji="🎯"
                         rows={pl.leaderboards.most_intl_goals} metric={p => p.intl_goals} />
            <Leaderboard title="Youngest Players" emoji="🐣"
                         rows={pl.leaderboards.youngest} metric={p => `${p.age}y`} />
          </div>

          <div>
            <h3 className="mb-2 font-bold">Every Player</h3>
            <PlayerStatsTable players={pl.players} />
          </div>
        </section>
      )}

      {/* ══ Match statistics ══ */}
      {mt && (
        <section className="space-y-5">
          <h2 className="text-xl font-extrabold">Match Statistics</h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <Stat label="Matches" value={mt.summary.matches} />
            <Stat label="Goals" value={mt.summary.goals} />
            <Stat label="Goals / match" value={mt.summary.goals_per_match.toFixed(2)} />
            <Stat label="Draws" value={mt.summary.draws} />
            <Stat label="Shootouts" value={mt.summary.shootouts} />
            <Stat label="Most in a match" value={mt.summary.highest_scoring} />
          </div>

          {/* Goals by stage */}
          <div>
            <h3 className="mb-2 font-bold">Goals by Stage</h3>
            <div className="card divide-y divide-black/5">
              {mt.goals_by_stage.map(s => {
                const max = Math.max(...mt.goals_by_stage.map(x => x.goals), 1)
                return (
                  <div key={s.stage} className="flex items-center gap-3 px-4 py-2 text-sm">
                    <span className="w-32 shrink-0 font-medium">{s.stage}</span>
                    <div className="flex-1">
                      <div className="h-3 rounded-full bg-accent"
                           style={{ width: `${Math.round((s.goals / max) * 100)}%` }} />
                    </div>
                    <span className="w-24 shrink-0 text-right text-black/60">
                      <b className="text-black/80">{s.goals}</b> in {s.matches}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <MatchList title="Highest-Scoring Matches" emoji="🔥"
                       rows={mt.highest_scoring} badge={r => `${r.total} goals`} />
            <MatchList title="Biggest Wins" emoji="💥"
                       rows={mt.biggest_wins} badge={r => `+${r.margin}`} />
          </div>

          {mt.shootout_matches.length > 0 && (
            <div>
              <h3 className="mb-2 font-bold">Decided by Penalties <span className="text-accent">🥅</span></h3>
              <div className="card divide-y divide-black/5">
                {mt.shootout_matches.map((s, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
                    <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-black/50">{s.stage}</span>
                    <TeamBadge team={s.home} size="sm" showName={false} />
                    <span className="font-mono font-bold">{s.score}</span>
                    <TeamBadge team={s.away} size="sm" showName={false} />
                    <span className="text-xs text-black/50">(pens {s.shootout})</span>
                    <span className="ml-auto text-xs">
                      won by <b>{s.winner.code}</b>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {!pl && !mt && (
        <p className="text-black/60">Statistics are not available right now.</p>
      )}
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

function Leaderboard({
  title, emoji, rows, metric,
}: {
  title: string; emoji: string; rows: PlayerStat[]
  metric: (p: PlayerStat) => number | string
}) {
  return (
    <div className="card p-4">
      <h3 className="mb-2 font-bold">{title} <span className="text-accent">{emoji}</span></h3>
      <ol className="space-y-1.5">
        {rows.map((p, i) => (
          <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="w-4 text-xs text-black/40">{i + 1}.</span>
              <span className="truncate font-medium">{p.name}{p.is_captain ? ' (C)' : ''}</span>
              <TeamBadge team={p.team} size="sm" showName={false} />
            </span>
            <span className="shrink-0 font-mono font-bold">{metric(p)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function MatchList({
  title, emoji, rows, badge,
}: {
  title: string; emoji: string
  rows: MatchStats['highest_scoring']
  badge: (r: MatchStats['highest_scoring'][number]) => string
}) {
  return (
    <div className="card p-4">
      <h3 className="mb-2 font-bold">{title} <span className="text-accent">{emoji}</span></h3>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5">
              <TeamBadge team={r.home} size="sm" showName={false} />
              <span className="font-semibold">{r.home.code}</span>
            </span>
            <span className="font-mono font-bold">{r.home_score}-{r.away_score}</span>
            <span className="flex items-center gap-1.5">
              <span className="font-semibold">{r.away.code}</span>
              <TeamBadge team={r.away} size="sm" showName={false} />
            </span>
            <span className="text-xs text-black/40">· {r.stage}</span>
            <span className="ml-auto rounded bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
              {badge(r)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
