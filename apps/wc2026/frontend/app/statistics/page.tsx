import { api, type PlayerStats, type MatchStats, type PlayerStat, type Streak, type AttendanceRow } from '@/lib/api'
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
            <Leaderboard title="Youngest Players" emoji="🐣"
                         rows={pl.leaderboards.youngest} metric={p => `${p.age}y`} />
            {/* Defensive/rating metrics need the optional API-Football backfill
                (tackles, interceptions, duels, minutes, rating) — hidden until
                that's run so the page doesn't show an all-zero leaderboard. */}
            {pl.summary.af_enriched && (
              <>
                <Leaderboard title="Most Tackles" emoji="🛡️"
                             rows={pl.leaderboards.most_tackles} metric={p => p.tackles} />
                <Leaderboard title="Best Rated (min. 3 apps)" emoji="⭐"
                             rows={pl.leaderboards.top_rating}
                             metric={p => p.avg_rating?.toFixed(2) ?? '—'} />
              </>
            )}
          </div>

          <div>
            <h3 className="mb-2 font-bold">Every Player</h3>
            <PlayerStatsTable players={pl.players} enriched={pl.summary.af_enriched} />
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

          {/* Team Discipline */}
          {mt.team_discipline.length > 0 && (
            <div>
              <h3 className="mb-2 font-bold">Team Discipline <span className="text-accent">🟨</span></h3>
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-pitch/5 text-xs uppercase tracking-wide text-pitch">
                    <tr>
                      <th className="py-2 pl-3 text-left">#</th>
                      <th className="py-2 text-left">Team</th>
                      <th className="py-2 text-right">Played</th>
                      <th className="py-2 text-right">🟨</th>
                      <th className="py-2 text-right">🟥</th>
                      <th className="py-2 pr-3 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mt.team_discipline.map((d, i) => (
                      <tr key={d.team.code} className="border-t border-black/5">
                        <td className="py-2 pl-3 font-mono text-black/40">{i + 1}</td>
                        <td className="py-2"><TeamBadge team={d.team} size="sm" /></td>
                        <td className="py-2 text-right text-black/60">{d.played}</td>
                        <td className="py-2 text-right">{d.yellow_cards}</td>
                        <td className="py-2 text-right">{d.red_cards}</td>
                        <td className="py-2 pr-3 text-right font-bold">{d.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-xs text-black/50">Points = 1 per yellow card, 3 per red card.</p>
            </div>
          )}

          {/* Streaks */}
          {(mt.streaks.winning.length > 0 || mt.streaks.unbeaten.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              <StreakList title="Longest Winning Streaks" emoji="🔥" rows={mt.streaks.winning} />
              <StreakList title="Longest Unbeaten Streaks" emoji="🛡️" rows={mt.streaks.unbeaten} />
            </div>
          )}

          {/* Attendance — only once /admin/enrich-attendance has run */}
          {mt.attendance && (
            <div>
              <h3 className="mb-2 font-bold">Attendance <span className="text-accent">🏟️</span></h3>
              <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Total attendance" value={mt.attendance.total.toLocaleString()} />
                <Stat label="Average / match" value={mt.attendance.average.toLocaleString()} />
                <Stat label="Matches recorded" value={mt.attendance.matches_recorded} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <AttendanceCard label="Largest crowd" row={mt.attendance.highest} />
                <AttendanceCard label="Smallest crowd" row={mt.attendance.lowest} />
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

function StreakList({ title, emoji, rows }: { title: string; emoji: string; rows: Streak[] }) {
  return (
    <div className="card p-4">
      <h3 className="mb-2 font-bold">{title} <span className="text-accent">{emoji}</span></h3>
      <ol className="space-y-1.5">
        {rows.map((s, i) => (
          <li key={s.team.code} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="w-4 text-xs text-black/40">{i + 1}.</span>
              <TeamBadge team={s.team} size="sm" />
            </span>
            <span className="shrink-0 font-mono font-bold">{s.games} games</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function AttendanceCard({ label, row }: { label: string; row: AttendanceRow }) {
  return (
    <div className="card p-4">
      <p className="mb-2 text-xs uppercase tracking-wide text-black/50">{label}</p>
      <p className="mb-2 text-2xl font-extrabold text-pitch">{row.attendance.toLocaleString()}</p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <TeamBadge team={row.home} size="sm" showName={false} />
        <span className="font-semibold">{row.home.code}</span>
        <span className="text-black/40">vs</span>
        <span className="font-semibold">{row.away.code}</span>
        <TeamBadge team={row.away} size="sm" showName={false} />
      </div>
      <p className="mt-1 text-xs text-black/50">{row.venue ?? 'Venue unknown'} · {row.stage}</p>
    </div>
  )
}
