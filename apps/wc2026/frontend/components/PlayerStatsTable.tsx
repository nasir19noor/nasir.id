'use client'

import { useMemo, useState } from 'react'
import type { PlayerStat } from '@/lib/api'
import TeamBadge from './TeamBadge'

type SortKey = 'goals' | 'assists' | 'cards' | 'caps' | 'intl_goals' | 'age' | 'name'

/** Searchable, sortable table of every player's tournament statistics. */
export default function PlayerStatsTable({ players }: { players: PlayerStat[] }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<SortKey>('goals')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = needle
      ? players.filter(p =>
          p.name.toLowerCase().includes(needle) ||
          p.team.name.toLowerCase().includes(needle) ||
          p.team.code.toLowerCase().includes(needle) ||
          (p.club ?? '').toLowerCase().includes(needle))
      : players
    return [...list].sort((a, b) => {
      if (sort === 'name') {
        return dir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      }
      const av = (a[sort] as number) ?? 0
      const bv = (b[sort] as number) ?? 0
      return dir === 'asc' ? av - bv : bv - av
    })
  }, [players, q, sort, dir])

  function toggle(key: SortKey) {
    if (sort === key) setDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSort(key); setDir(key === 'name' || key === 'age' ? 'asc' : 'desc') }
  }

  const arrow = (key: SortKey) => (sort === key ? (dir === 'asc' ? ' ▲' : ' ▼') : '')

  return (
    <div>
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search player, country, or club…"
        className="mb-3 w-full rounded-lg border border-black/15 px-3 py-2 text-sm
                   focus:border-pitch focus:outline-none"
      />
      <div className="card max-h-[34rem] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-pitch text-xs uppercase tracking-wide text-chalk">
            <tr>
              <th onClick={() => toggle('name')} className="cursor-pointer py-2 pl-3 text-left">Player{arrow('name')}</th>
              <th className="py-2 text-left">Country</th>
              <th className="hidden py-2 text-left sm:table-cell">Pos</th>
              <th className="hidden py-2 text-left md:table-cell">Club</th>
              <th onClick={() => toggle('age')} className="cursor-pointer py-2 text-right">Age{arrow('age')}</th>
              <th onClick={() => toggle('caps')} className="hidden cursor-pointer py-2 text-right sm:table-cell">Caps{arrow('caps')}</th>
              <th onClick={() => toggle('intl_goals')} className="hidden cursor-pointer py-2 text-right lg:table-cell">Int'l G{arrow('intl_goals')}</th>
              <th onClick={() => toggle('goals')} className="cursor-pointer py-2 text-right">Goals{arrow('goals')}</th>
              <th onClick={() => toggle('assists')} className="cursor-pointer py-2 text-right">Ast{arrow('assists')}</th>
              <th onClick={() => toggle('cards')} className="hidden cursor-pointer py-2 pr-3 text-right sm:table-cell">Cards{arrow('cards')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.id} className="border-t border-black/5 hover:bg-black/[0.02]">
                <td className="py-2 pl-3 font-medium">{p.name}{p.is_captain ? ' (C)' : ''}</td>
                <td className="py-2"><TeamBadge team={p.team} size="sm" showName={false} /></td>
                <td className="hidden py-2 text-black/60 sm:table-cell">{p.position ?? '—'}</td>
                <td className="hidden py-2 text-black/60 md:table-cell">{p.club ?? '—'}</td>
                <td className="py-2 text-right">{p.age ?? '—'}</td>
                <td className="hidden py-2 text-right sm:table-cell">{p.caps}</td>
                <td className="hidden py-2 text-right lg:table-cell">{p.intl_goals}</td>
                <td className="py-2 text-right font-bold">{p.goals}</td>
                <td className="py-2 text-right">{p.assists}</td>
                <td className="hidden py-2 pr-3 text-right sm:table-cell">
                  {p.yellow_cards}🟨{p.red_cards ? ` ${p.red_cards}🟥` : ''}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={10} className="p-6 text-center text-black/50">
                No players match “{q}”.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-black/50">
        Showing {rows.length} of {players.length} players · tap a column header to sort
      </p>
    </div>
  )
}
