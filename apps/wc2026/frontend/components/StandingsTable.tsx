import type { Standing } from '@/lib/api'
import TeamBadge from './TeamBadge'

export default function StandingsTable({ rows }: { rows: Standing[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-pitch/5 text-xs uppercase tracking-wide text-pitch">
        <tr>
          <th className="py-2 pl-3 text-left">#</th>
          <th className="py-2 text-left">Team</th>
          <th className="py-2 text-right">P</th>
          <th className="py-2 text-right">W</th>
          <th className="py-2 text-right">D</th>
          <th className="py-2 text-right">L</th>
          <th className="py-2 text-right">GF</th>
          <th className="py-2 text-right">GA</th>
          <th className="py-2 text-right">GD</th>
          <th className="py-2 pr-3 text-right font-bold">Pts</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.team.id}
              className={`border-t border-black/5 ${i < 2 ? 'bg-accent/5' : ''}`}>
            <td className="py-2 pl-3 font-mono text-xs text-black/40">{i + 1}</td>
            <td className="py-2"><TeamBadge team={r.team} /></td>
            <td className="py-2 text-right">{r.played}</td>
            <td className="py-2 text-right">{r.won}</td>
            <td className="py-2 text-right">{r.drawn}</td>
            <td className="py-2 text-right">{r.lost}</td>
            <td className="py-2 text-right">{r.gf}</td>
            <td className="py-2 text-right">{r.ga}</td>
            <td className={`py-2 text-right ${r.gd > 0 ? 'text-green-700' : r.gd < 0 ? 'text-red-600' : ''}`}>
              {r.gd > 0 ? `+${r.gd}` : r.gd}
            </td>
            <td className="py-2 pr-3 text-right font-bold">{r.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
