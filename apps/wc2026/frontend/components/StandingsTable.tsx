import type { Standing } from '@/lib/api'
import TeamBadge from './TeamBadge'

export default function StandingsTable({ rows }: { rows: Standing[] }) {
  return (
    // Horizontal scroll guard: on very narrow phones the 10-column table can
    // still exceed the viewport — scroll rather than squish/clip.
    <div className="overflow-x-auto">
    <table className="w-full min-w-[20rem] text-sm">
      <thead className="bg-pitch/5 text-xs uppercase tracking-wide text-pitch">
        <tr>
          <th className="py-2 pl-3 text-left">#</th>
          <th className="py-2 text-left">Team</th>
          <th className="py-2 pr-2 text-right">P</th>
          <th className="py-2 pr-2 text-right">W</th>
          <th className="py-2 pr-2 text-right">D</th>
          <th className="py-2 pr-2 text-right">L</th>
          <th className="hidden py-2 pr-2 text-right sm:table-cell">GF</th>
          <th className="hidden py-2 pr-2 text-right sm:table-cell">GA</th>
          <th className="py-2 pr-2 text-right">GD</th>
          <th className="py-2 pr-3 text-right font-bold">Pts</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.team.id}
              className={`border-t border-black/5 ${i < 2 ? 'bg-accent/5' : ''}`}>
            <td className="py-2 pl-3 font-mono text-xs text-black/40">{i + 1}</td>
            <td className="py-2">
              {/* Flag + code always; full country name only on wider screens. */}
              <span className="flex items-center gap-2">
                <TeamBadge team={r.team} size="sm" showName={false} />
                <span className="font-semibold">{r.team.code}</span>
                <span className="ml-1 hidden text-black/60 sm:inline">{r.team.name}</span>
              </span>
            </td>
            <td className="py-2 pr-2 text-right">{r.played}</td>
            <td className="py-2 pr-2 text-right">{r.won}</td>
            <td className="py-2 pr-2 text-right">{r.drawn}</td>
            <td className="py-2 pr-2 text-right">{r.lost}</td>
            <td className="hidden py-2 pr-2 text-right sm:table-cell">{r.gf}</td>
            <td className="hidden py-2 pr-2 text-right sm:table-cell">{r.ga}</td>
            <td className={`py-2 pr-2 text-right ${r.gd > 0 ? 'text-green-700' : r.gd < 0 ? 'text-red-600' : ''}`}>
              {r.gd > 0 ? `+${r.gd}` : r.gd}
            </td>
            <td className="py-2 pr-3 text-right font-bold">{r.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  )
}
