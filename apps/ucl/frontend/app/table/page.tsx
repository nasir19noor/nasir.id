import { api, type Table } from '@/lib/api'
import StandingsTable from '@/components/StandingsTable'

export const revalidate = 300

export default async function TablePage() {
  const table = await api<Table>('/table')
    .catch(() => ({ standings: [], matchdays: 0 }) as Table)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">League Phase Table</h1>
      {table.standings.length === 0 ? (
        <div className="card p-6 text-sm text-black/70">
          No standings yet — the league-phase draw is made in late August 2026
          and the table fills in from matchday 1 in September.
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <StandingsTable rows={table.standings} />
          </div>
          <div className="card flex flex-wrap gap-4 p-4 text-xs text-black/60">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-accent/40" /> 1-8 · straight to Round of 16
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-blue-500/20" /> 9-24 · knockout play-offs
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-black/10 bg-white" /> 25-36 · eliminated
            </span>
          </div>
        </>
      )}
    </div>
  )
}
