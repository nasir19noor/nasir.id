import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import './globals.css'

export const metadata: Metadata = {
  title:       'World Cup 2026',
  description: 'Live World Cup 2026 wall chart — groups, knockout, squads, top scorers.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-6 text-xs text-black/40">
          Data refreshes hourly from public sources. Built for wc2026.nasir.id.
        </footer>
      </body>
    </html>
  )
}
