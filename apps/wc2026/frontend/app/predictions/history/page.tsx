import Link from 'next/link'
import {
  api, type Team, type HistoryPage, type OverallAccuracy,
  type EvaluatedMatch,
} from '@/lib/api'
import TeamBadge from '@/components/TeamBadge'

export const dynamic = 'force-dynamic'

export default async function PredictionHistoryPage(
  { searchParams }: { searchParams: Promise<{ page?: string }> },
) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || '1', 10) || 1)

  const [hist, overall, teams] = await Promise.all([
    api<HistoryPage>(`/predictions/history?page=${page}&page_size=7`, { noStore: true })
      .catch(() => null),
    api<OverallAccuracy>('/predictions/accuracy', { noStore: true }).catch(() => null),
    api<Team[]>('/squads').catch(() => [] as Team[]),
  ])

  const byCode = new Map(teams.map(t => [t.code, t]))
  const team = (code: string): Team => byCode.get(code) ?? { id: -1, code, name: code }

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Prediction Results</h1>
          <p className="text-sm text-black/60">
            Every past prediction compared against the actual result.
          </p>
        </div>
        <Link href="/predictions" className="shrink-0 text-sm text-pitch underline">
          ← Today
        </Link>
      </header>

      {/* Overall accuracy */}
      {overall && (
        <section className="card p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <BigStat label="Winner accuracy"
                     value={overall.accuracy_pct != null ? `${overall.accuracy_pct}%` : '—'}
                     hint={`${overall.correct}/${overall.evaluated} correct`} />
            <BigStat label="Exact score"
                     value={overall.exact_score_pct != null ? `${overall.exact_score_pct}%` : '—'}
                     hint={`${overall.exact_score} spot on`} />
            <BigStat label="Matches graded" value={overall.evaluated} />
            <BigStat label="Days predicted" value={overall.total_days} />
          </div>
        </section>
      )}

      {/* Day-by-day */}
      {!hist || hist.days.length === 0 ? (
        <p className="card p-4 text-sm text-black/60">No prediction history yet.</p>
      ) : (
        <div className="space-y-6">
          {hist.days.map(day => (
            <section key={day.date} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-bold">{day.date}</h2>
                <span className="text-sm">
                  {day.accuracy.evaluated > 0 ? (
                    <span className="rounded bg-pitch/10 px-2 py-0.5 font-bold text-pitch">
                      {day.accuracy.accuracy_pct}% · {day.accuracy.correct}/{day.accuracy.evaluated}
                    </span>
                  ) : (
                    <span className="text-black/40">not played yet</span>
                  )}
                </span>
              </div>
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-pitch/5 text-xs uppercase text-pitch">
                    <tr>
                      <th className="py-2 pl-3 text-left">Match</th>
                      <th className="py-2 text-left">Predicted</th>
                      <th className="py-2 text-center">Win&nbsp;%</th>
                      <th className="py-2 text-center">Actual</th>
                      <th className="py-2 pr-3 text-center">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.predictions.map(m => (
                      <Row key={m.fixture_id} m={m} team={team} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          <Pagination page={hist.page} pages={hist.pages} />
        </div>
      )}
    </div>
  )
}

function Row({ m, team }: { m: EvaluatedMatch; team: (c: string) => Team }) {
  const home = team(m.home), away = team(m.away)
  const predWinPct =
    m.predicted_winner === 'draw' ? m.draw_pct
      : m.predicted_winner === m.home ? m.home_win_pct
      : m.away_win_pct
  const predLabel =
    m.predicted_winner === 'draw' ? 'Draw' : team(m.predicted_winner).code

  let badge
  if (m.correct === null) {
    badge = <span className="rounded bg-black/10 px-2 py-0.5 text-[10px] font-bold uppercase text-black/50">Pending</span>
  } else if (m.correct) {
    badge = <span className="rounded bg-green-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">✓ Correct</span>
  } else {
    badge = <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">✗ Wrong</span>
  }

  const actual = m.actual.settled
    ? `${m.actual.home_score}-${m.actual.away_score}`
    : '—'

  return (
    <tr className="border-t border-black/5">
      <td className="py-2 pl-3">
        <span className="flex items-center gap-1.5">
          <TeamBadge team={home} size="sm" showName={false} />
          <span className="text-xs text-black/40">v</span>
          <TeamBadge team={away} size="sm" showName={false} />
        </span>
      </td>
      <td className="py-2">
        <span className="font-semibold">{predLabel}</span>
        <span className="ml-1 text-black/40">({m.likely_score})</span>
      </td>
      <td className="py-2 text-center font-mono">{predWinPct}%</td>
      <td className="py-2 text-center font-mono font-bold">{actual}</td>
      <td className="py-2 pr-3 text-center">{badge}</td>
    </tr>
  )
}

function Pagination({ page, pages }: { page: number; pages: number }) {
  if (pages <= 1) return null
  return (
    <nav className="flex items-center justify-center gap-3 text-sm">
      {page > 1 ? (
        <Link href={`/predictions/history?page=${page - 1}`}
              className="rounded bg-pitch px-3 py-1.5 font-medium text-chalk hover:bg-pitch/90">
          ← Newer
        </Link>
      ) : <span className="px-3 py-1.5 text-black/30">← Newer</span>}
      <span className="text-black/50">Page {page} of {pages}</span>
      {page < pages ? (
        <Link href={`/predictions/history?page=${page + 1}`}
              className="rounded bg-pitch px-3 py-1.5 font-medium text-chalk hover:bg-pitch/90">
          Older →
        </Link>
      ) : <span className="px-3 py-1.5 text-black/30">Older →</span>}
    </nav>
  )
}

function BigStat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-lg bg-pitch/5 p-4 text-center">
      <div className="text-3xl font-extrabold text-pitch">{value}</div>
      <div className="text-xs uppercase tracking-wide text-black/60">{label}</div>
      {hint && <div className="mt-1 text-[11px] text-black/50">{hint}</div>}
    </div>
  )
}
