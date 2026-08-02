import Link from 'next/link'
import { api, type Fixture } from '@/lib/api'
import FixturesList from '@/components/FixturesList'

export const revalidate = 300

const MATCHDAYS = [1, 2, 3, 4, 5, 6, 7, 8]

export default async function FixturesPage({
  searchParams,
}: {
  searchParams: Promise<{ md?: string }>
}) {
  const { md } = await searchParams
  const matchday = MATCHDAYS.includes(Number(md)) ? Number(md) : null

  const path = matchday
    ? `/fixtures?round=league&matchday=${matchday}`
    : '/fixtures?round=league'
  const fixtures = await api<Fixture[]>(path).catch(() => [] as Fixture[])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">League Phase Fixtures</h1>

      <div className="flex flex-wrap gap-2">
        <MdLink href="/fixtures" active={matchday === null} label="All" />
        {MATCHDAYS.map(n => (
          <MdLink key={n} href={`/fixtures?md=${n}`} active={matchday === n}
                  label={`MD ${n}`} />
        ))}
      </div>

      <div className="card">
        {fixtures.length
          ? <FixturesList fixtures={fixtures} />
          : (
            <p className="p-4 text-sm text-black/60">
              No fixtures yet — they are published after the league-phase draw
              in late August 2026.
            </p>
          )}
      </div>
    </div>
  )
}

function MdLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href}
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            active
              ? 'bg-night text-chalk'
              : 'bg-white text-night ring-1 ring-black/10 hover:bg-night/5'
          }`}>
      {label}
    </Link>
  )
}
