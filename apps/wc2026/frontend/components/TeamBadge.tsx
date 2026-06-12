import type { Team } from '@/lib/api'

type Size = 'sm' | 'md' | 'lg'

export default function TeamBadge({
  team, size = 'md', showName = true,
}: { team: Team; size?: Size; showName?: boolean }) {
  const flagW = size === 'sm' ? 20 : size === 'lg' ? 40 : 28
  const flagH = Math.round(flagW * 0.75)
  const url   = team.iso2
    ? `https://flagcdn.com/w${flagW * 2}/${team.iso2}.png`
    : null

  return (
    <span className="inline-flex items-center gap-2">
      {url ? (
        // Using <img> (not next/image) keeps the runtime tiny for the many
        // flags rendered per page, and flagcdn already serves correctly sized assets.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={team.name} width={flagW} height={flagH}
             className="rounded-sm shadow ring-1 ring-black/10" />
      ) : (
        <span className="rounded bg-black/5 px-1 text-[10px] font-bold">
          {team.code}
        </span>
      )}
      {showName && (
        <span className={size === 'sm' ? 'text-xs' : 'text-sm'}>
          <span className="font-semibold">{team.code}</span>
          <span className="ml-1 text-black/60">{team.name}</span>
        </span>
      )}
    </span>
  )
}
