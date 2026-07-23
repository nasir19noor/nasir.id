'use client'

import { useMemo, useState } from 'react'
import type { PlayerStat } from '@/lib/api'
import TeamBadge from './TeamBadge'

type SortKey = 'goals' | 'assists' | 'cards' | 'age' | 'name'
  | 'minutes_played' | 'avg_rating' | 'tackles'

const POSITION_ORDER: Record<string, number> = { GK: 1, DF: 2, MF: 3, FW: 4 }
const ALL = 'all'

/** Searchable, sortable, filterable table of every player's tournament
 * statistics. `enriched` reveals the Minutes/Rating/Tackles columns (only
 * meaningful once the optional API-Football backfill has run). */
export default function PlayerStatsTable({
  players, enriched = false,
}: { players: PlayerStat[]; enriched?: boolean }) {
  const [q, setQ] = useState('')
  const [country, setCountry] = useState(ALL)
  const [position, setPosition] = useState(ALL)
  const [club, setClub] = useState(ALL)
  const [sort, setSort] = useState<SortKey>('goals')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')

  const countries = useMemo(() => {
    const seen = new Map<string, string>()
    for (const p of players) seen.set(p.team.code, p.team.name)
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [players])

  const positions = useMemo(() => {
    const seen = new Set(players.map(p => p.position).filter((x): x is string => !!x))
    return [...seen].sort((a, b) => (POSITION_ORDER[a] ?? 9) - (POSITION_ORDER[b] ?? 9))
  }, [players])

  const clubs = useMemo(() => {
    const seen = new Set(players.map(p => p.club).filter((x): x is string => !!x))
    return [...seen].sort((a, b) => a.localeCompare(b))
  }, [players])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = players.filter(p => {
      if (country !== ALL && p.team.code !== country) return false
      if (position !== ALL && p.position !== position) return false
      if (club !== ALL && p.club !== club) return false
      if (!needle) return true
      return (
        p.name.toLowerCase().includes(needle) ||
        p.team.name.toLowerCase().includes(needle) ||
        p.team.code.toLowerCase().includes(needle) ||
        (p.club ?? '').toLowerCase().includes(needle)
      )
    })
    return [...list].sort((a, b) => {
      if (sort === 'name') {
        return dir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      }
      const av = (a[sort] as number) ?? 0
      const bv = (b[sort] as number) ?? 0
      return dir === 'asc' ? av - bv : bv - av
    })
  }, [players, q, country, position, club, sort, dir])

  function toggle(key: SortKey) {
    if (sort === key) setDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSort(key); setDir(key === 'name' || key === 'age' ? 'asc' : 'desc') }
  }

  const arrow = (key: SortKey) => (sort === key ? (dir === 'asc' ? ' ▲' : ' ▼') : '')
  const filtered = q.trim() !== '' || country !== ALL || position !== ALL || club !== ALL

  const selectClass = 'rounded-lg border border-black/15 bg-white px-3 py-2 text-sm ' +
    'focus:border-pitch focus:outline-none'

  return (
    <div>
      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search player, country, or club…"
          className={`sm:col-span-2 lg:col-span-1 ${selectClass}`}
        />
        <select value={country} onChange={e => setCountry(e.target.value)} className={selectClass}>
          <option value={ALL}>All Countries</option>
          {countries.map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
        <select value={position} onChange={e => setPosition(e.target.value)} className={selectClass}>
          <option value={ALL}>All Positions</option>
          {positions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
        </select>
        <select value={club} onChange={e => setClub(e.target.value)} className={selectClass}>
          <option value={ALL}>All Clubs</option>
          {clubs.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card max-h-[34rem] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-pitch text-xs uppercase tracking-wide text-chalk">
            <tr>
              <th onClick={() => toggle('name')} className="cursor-pointer py-2 pl-3 text-left">Player{arrow('name')}</th>
              <th className="py-2 text-left">Country</th>
              <th className="hidden py-2 text-left sm:table-cell">Pos</th>
              <th className="hidden py-2 text-left md:table-cell">Club</th>
              <th onClick={() => toggle('age')} className="cursor-pointer py-2 text-right">Age{arrow('age')}</th>
              <th onClick={() => toggle('goals')} className="cursor-pointer py-2 text-right">Goals{arrow('goals')}</th>
              <th onClick={() => toggle('assists')} className="cursor-pointer py-2 text-right">Ast{arrow('assists')}</th>
              <th onClick={() => toggle('cards')} className="hidden cursor-pointer py-2 text-right sm:table-cell">Cards{arrow('cards')}</th>
              {enriched && (
                <>
                  <th onClick={() => toggle('minutes_played')} className="hidden cursor-pointer py-2 text-right lg:table-cell">Mins{arrow('minutes_played')}</th>
                  <th onClick={() => toggle('tackles')} className="hidden cursor-pointer py-2 text-right lg:table-cell">Tkl{arrow('tackles')}</th>
                  <th onClick={() => toggle('avg_rating')} className="cursor-pointer py-2 pr-3 text-right">Rtg{arrow('avg_rating')}</th>
                </>
              )}
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
                <td className="py-2 text-right font-bold">{p.goals}</td>
                <td className="py-2 text-right">{p.assists}</td>
                <td className="hidden py-2 text-right sm:table-cell">
                  {p.yellow_cards}🟨{p.red_cards ? ` ${p.red_cards}🟥` : ''}
                </td>
                {enriched && (
                  <>
                    <td className="hidden py-2 text-right lg:table-cell">{p.minutes_played || '—'}</td>
                    <td className="hidden py-2 text-right lg:table-cell">{p.tackles || '—'}</td>
                    <td className="py-2 pr-3 text-right">{p.avg_rating?.toFixed(1) ?? '—'}</td>
                  </>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={enriched ? 11 : 8} className="p-6 text-center text-black/50">
                {filtered ? 'No players match these filters.' : 'No players found.'}
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
