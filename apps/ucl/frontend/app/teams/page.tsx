import Link from 'next/link'
import { api, type TeamInfo } from '@/lib/api'

export const revalidate = 300

export default async function TeamsPage() {
  const teams = await api<TeamInfo[]>('/teams').catch(() => [] as TeamInfo[])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Clubs</h1>
      {teams.length === 0 ? (
        <div className="card p-6 text-sm text-black/70">
          No clubs yet — the 36 league-phase clubs appear here automatically
          once the draw is made in late August 2026.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {teams.map(t => (
            <Link key={t.id} href={`/teams/${t.id}`}
                  className="card flex items-center gap-3 p-3 hover:shadow-md">
              {t.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.logo} alt={t.name} width={40} height={40}
                     className="shrink-0 object-contain" />
              ) : (
                <span className="rounded bg-black/5 px-1 text-xs font-bold">{t.code}</span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{t.name}</span>
                <span className="block truncate text-xs text-black/50">
                  {t.country ?? t.code ?? ''}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
