import type { Team } from '@/lib/api'

type Size = 'sm' | 'md' | 'lg'

const DISPLAY_W: Record<Size, number> = { sm: 20, md: 28, lg: 40 }

export default function TeamBadge({
  team, size = 'md', showName = true,
}: { team: Team; size?: Size; showName?: boolean }) {
  const w = DISPLAY_W[size]

  return (
    <span className="inline-flex items-center gap-2">
      {team.logo ? (
        // Plain <img> (not next/image) keeps the runtime tiny for the many
        // crests per page; ESPN's CDN already serves a small square asset.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo} alt={team.name} width={w} height={w}
             className="shrink-0 object-contain" />
      ) : (
        <span className="rounded bg-black/5 px-1 text-[10px] font-bold">
          {team.code ?? '?'}
        </span>
      )}
      {showName && (
        <span className={size === 'sm' ? 'text-xs' : 'text-sm'}>
          <span className="font-semibold">{team.name}</span>
        </span>
      )}
    </span>
  )
}
