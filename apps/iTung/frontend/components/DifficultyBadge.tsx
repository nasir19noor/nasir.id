const labels: Record<string, string> = {
  sangat_mudah: 'Sangat Mudah',
  mudah:        'Mudah',
  sedang:       'Sedang',
  sulit:        'Sulit',
  sangat_sulit: 'Sangat Sulit',
  // legacy fallbacks
  easy:   'Mudah',
  medium: 'Sedang',
  hard:   'Sulit',
}

const colors: Record<string, string> = {
  sangat_mudah: 'bg-sky-100 text-sky-700',
  mudah:        'bg-green-100 text-green-700',
  sedang:       'bg-yellow-100 text-yellow-700',
  sulit:        'bg-orange-100 text-orange-700',
  sangat_sulit: 'bg-red-100 text-red-700',
  // legacy fallbacks
  easy:   'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard:   'bg-red-100 text-red-700',
}

export default function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors[difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[difficulty] ?? difficulty}
    </span>
  )
}
