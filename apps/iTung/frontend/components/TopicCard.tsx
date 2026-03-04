'use client'

interface TopicCardProps {
  topic: string
  onClick: () => void
}

const topicEmoji: Record<string, string> = {
  // ── Dasar ────────────────────────────────────────────────────────
  'mengenal bilangan':                    '🔢',
  'penjumlahan dasar':                    '➕',
  'pengurangan dasar':                    '➖',
  'penjumlahan dan pengurangan dasar':    '🔄',
  'pengenalan perkalian':                 '✖️',
  'pengenalan pembagian':                 '➗',
  'perkalian':                            '✖️',
  'pembagian':                            '➗',
  'perkalian dan pembagian':              '🧮',
  'operasi hitung campuran':              '🧮',
  'bilangan bulat':                       '🔵',
  'bilangan romawi':                      '🏛️',
  'bilangan pecahan':                     '½',
  'bilangan desimal':                     '🔟',
  'persen':                               '💯',
  'KPK':                                  '🔁',
  'FPB':                                  '🔀',
  'faktor dan kelipatan':                 '🔢',
  'rasio dan proporsi':                   '⚖️',
  'nilai uang':                           '💰',
  'garis bilangan':                       '📊',
  'koordinat kartesius sederhana':        '📍',
  'skala dan denah':                      '🗺️',
  'pengenalan waktu':                     '🕐',
  'pengukuran waktu':                     '⏱️',
  'pengukuran panjang':                   '📏',
  'pengukuran berat':                     '⚖️',
  'satuan':                               '📐',
  'mengenal bangun datar':                '🔷',
  'keliling bangun datar':                '🔷',
  'luas persegi dan persegi panjang':     '⬜',
  'luas bangun datar':                    '🔷',
  'luas lingkaran':                       '⭕',
  'keliling lingkaran':                   '⭕',
  'sudut dan jenis sudut':                '📐',
  'volume kubus dan balok':               '📦',
  'volume prisma dan tabung':             '🧊',
  'sifat bangun ruang':                   '🎲',
  'mean median modus':                    '📊',
  // ── Menengah ─────────────────────────────────────────────────────
  'bilangan bulat lanjutan':              '🔢',
  'bilangan berpangkat':                  '📈',
  'bentuk akar':                          '√',
  'himpunan':                             '⊂',
  'aljabar dasar':                        '🔤',
  'persamaan linear satu variabel':       '➡️',
  'sistem persamaan linear dua variabel': '⚖️',
  'persamaan kuadrat':                    '📐',
  'fungsi kuadrat':                       '📈',
  'relasi dan fungsi':                    '↔️',
  'persamaan garis lurus':                '📏',
  'perbandingan senilai':                 '⚖️',
  'perbandingan berbalik nilai':          '🔄',
  'aritmatika sosial':                    '💼',
  'teorema pythagoras':                   '📐',
  'garis dan sudut':                      '📐',
  'segitiga':                             '🔺',
  'segiempat':                            '⬜',
  'lingkaran':                            '⭕',
  'kesebangunan dan kekongruenan':        '🔷',
  'bangun ruang sisi datar':              '📦',
  'bangun ruang sisi lengkung':           '⚽',
  'transformasi geometri':               '🔄',
  'statistika':                           '📊',
  'peluang':                              '🎲',
  // ── Atas ─────────────────────────────────────────────────────────
  'eksponen dan logaritma':               '📈',
  'sistem persamaan linear':              '⚖️',
  'pertidaksamaan linear':                '🔢',
  'fungsi':                               '📈',
  'komposisi fungsi':                     '🔗',
  'invers fungsi':                        '🔄',
  'trigonometri dasar':                   '📐',
  'aturan sinus dan kosinus':             '📐',
  'polinomial':                           '🔢',
  'limit fungsi':                         '∞',
  'turunan fungsi':                       '📉',
  'aplikasi turunan':                     '🔬',
  'integral tak tentu':                   '∫',
  'integral tentu':                       '∫',
  'aplikasi integral':                    '🔬',
  'matriks':                              '🔢',
  'determinan matriks':                   '🔢',
  'transformasi matriks':                 '🔄',
  'vektor 2D':                            '➡️',
  'vektor 3D':                            '🎯',
  'barisan aritmatika':                   '📊',
  'deret aritmatika':                     '∑',
  'barisan geometri':                     '📈',
  'deret geometri':                       '📈',
  'permutasi':                            '🔀',
  'kombinasi':                            '🎲',
  'peluang lanjutan':                     '🎲',
  'peluang distribusi binomial':          '📊',
  'geometri dimensi dua':                 '🔷',
  'geometri dimensi tiga':                '🧊',
  'geometri analitik lingkaran':          '⭕',
  'program linear':                       '📈',
  'statistika inferensial':               '📊',
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
