import { api, type Bracket } from '@/lib/api'
import KnockoutBracket from '@/components/KnockoutBracket'

export const revalidate = 300

export default async function KnockoutPage() {
  const bracket = await api<Bracket[]>('/knockout').catch(() => [] as Bracket[])
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Knockout Bracket</h1>
      <p className="text-sm text-black/60">
        Updated hourly from live results. Empty slots show “TBD” until the
        qualifying teams are decided.
      </p>
      <div className="card p-4">
        <KnockoutBracket bracket={bracket} />
      </div>
    </div>
  )
}
