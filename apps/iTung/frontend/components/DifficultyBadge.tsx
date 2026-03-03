const labels: Record<string, string> = {
  easy: 'Mudah',
  medium: 'Sedang',
  hard: 'Sulit',
}

const colors: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
}

export default function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors[difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[difficulty] ?? difficulty}
    </span>
  )
}
