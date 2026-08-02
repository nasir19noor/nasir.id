import { api, type Round } from '@/lib/api'
import KnockoutRounds from '@/components/KnockoutRounds'

export const revalidate = 300

export default async function KnockoutPage() {
  const rounds = await api<Round[]>('/knockout').catch(() => [] as Round[])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Knockout Phase</h1>
      <p className="text-sm text-black/60">
        Two-legged ties from the play-offs to the semi-finals; the final is a
        single match. Aggregate winners in bold.
      </p>
      <KnockoutRounds rounds={rounds} />
    </div>
  )
}
