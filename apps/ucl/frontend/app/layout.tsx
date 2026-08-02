import type { Metadata, Viewport } from 'next'
import Navbar from '@/components/Navbar'
import './globals.css'

export const metadata: Metadata = {
  title:       'UEFA Champions League 2026/27',
  description: 'Live UCL 2026/27 wall chart — league table, fixtures, knockout ties, top scorers.',
}

// Explicit mobile viewport so phones render at device width (not zoomed-out
// desktop width). maximumScale left unset so users can still pinch-zoom.
export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  themeColor:   '#0b164a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="overflow-x-hidden">
        <Navbar />
        <main className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-3 py-6 text-xs text-black/40 sm:px-4">
          Data refreshes hourly from public sources. Built for ucl.nasir.id.
        </footer>
      </body>
    </html>
  )
}
