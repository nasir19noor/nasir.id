'use client'

interface TopicCardProps {
  topic: string
  onClick: () => void
}

const topicEmoji: Record<string, string> = {
  penjumlahan:                '➕',
  pengurangan:                '➖',
  perkalian:                  '✖️',
  pembagian:                  '➗',
  ukuran:                     '📐',
  waktu:                      '⏰',
  berat:                      '⚖️',
  panjang:                    '📏',
  'perhitungan bangun datar': '🔷',
  'garis bilangan':           '📊',
  'nilai uang':               '💰',
  satuan:                     '🔢',
  'bilangan pecahan':         '½',
  'perhitungan besaran sudut':'📐',
  KPK:                        '🔁',
  FPB:                        '🔀',
  'bilangan bulat':           '🔢',
}

export default function TopicCard({ topic, onClick }: TopicCardProps) {
  const emoji = topicEmoji[topic] ?? '📚'
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-xl shadow-sm
        hover:border-primary-400 hover:shadow-md hover:bg-primary-50 transition-all duration-150 text-center"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs font-semibold text-gray-700 capitalize leading-tight">{topic}</span>
    </button>
  )
}
