import { highlightsUrl, type Team } from '@/lib/api'

/**
 * Small YouTube link to highlights for a single match. Renders nothing when
 * either team is still undecided (e.g. an unfilled knockout slot).
 */
export default function HighlightsLink({
  home, away, size = 18,
}: {
  home?: Team | null
  away?: Team | null
  size?: number
}) {
  const url = highlightsUrl(home, away)
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Watch highlights on YouTube (FolaPlay)"
      aria-label="Watch highlights on YouTube"
      className="inline-flex shrink-0 items-center text-[#FF0000] transition hover:scale-110"
    >
      <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
        <path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51A3.02 3.02 0 0 0 23.5 17.8 31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.25 3.6-6.25 3.6Z" />
      </svg>
    </a>
  )
}
