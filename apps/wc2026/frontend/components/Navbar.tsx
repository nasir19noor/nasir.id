'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const links = [
  { href: '/',         label: 'Home' },
  { href: '/groups',   label: 'Groups' },
  { href: '/knockout', label: 'Knockout' },
  { href: '/scorers',  label: 'Top Scorers' },
  { href: '/predictions', label: 'Predictions' },
  { href: '/squads',   label: 'Squads' },
  { href: '/admin',    label: 'Admin' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="bg-pitch text-chalk shadow">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-3 py-3 sm:px-4">
        <Link href="/" onClick={() => setOpen(false)}
              className="text-lg font-extrabold tracking-tight sm:text-xl">
          ⚽ <span className="text-accent">WC&nbsp;2026</span>
        </Link>

        {/* Desktop / tablet: inline links */}
        <nav className="ml-auto hidden gap-4 text-sm font-medium md:flex">
          {links.map(l => (
            <Link key={l.href} href={l.href}
                  className={`hover:text-accent ${
                    pathname === l.href ? 'text-accent' : 'opacity-90 hover:opacity-100'
                  }`}>
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Mobile: hamburger toggle */}
        <button type="button" onClick={() => setOpen(o => !o)}
                aria-label="Toggle menu" aria-expanded={open}
                className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md
                           hover:bg-white/10 md:hidden">
          <span className="text-xl leading-none">{open ? '✕' : '☰'}</span>
        </button>
      </div>

      {/* Mobile: collapsible panel */}
      {open && (
        <nav className="border-t border-white/10 px-3 pb-3 md:hidden">
          <ul className="flex flex-col">
            {links.map(l => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)}
                      className={`block rounded-md px-2 py-2.5 text-sm font-medium hover:bg-white/10 ${
                        pathname === l.href ? 'text-accent' : 'opacity-90'
                      }`}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
