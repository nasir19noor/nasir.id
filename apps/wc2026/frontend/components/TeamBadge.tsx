import type { Team } from '@/lib/api'

type Size = 'sm' | 'md' | 'lg'

// flagcdn only serves a fixed set of widths (w20, w40, w80, w160, ...).
// Choose a CDN width per size; display dimensions are independent.
const FLAG_CDN_WIDTH: Record<Size, number> = { sm: 40, md: 80, lg: 160 }
const FLAG_DISPLAY_W: Record<Size, number> = { sm: 20, md: 28, lg: 40 }

export default function TeamBadge({
  team, size = 'md', showName = true,
}: { team: Team; size?: Size; showName?: boolean }) {
  const displayW = FLAG_DISPLAY_W[size]
  const displayH = Math.round(displayW * 0.75)
  const url      = team.iso2
    ? `https://flagcdn.com/w${FLAG_CDN_WIDTH[size]}/${team.iso2}.png`
    : null

  return (
    <span className="inline-flex items-center gap-2">
      {url ? (
        // Plain <img> (not next/image) keeps the runtime tiny for the many
        // flags per page; flagcdn already serves a small, sized asset.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={team.name} width={displayW} height={displayH}
             className="rounded-sm shadow ring-1 ring-black/10 object-cover" />
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
