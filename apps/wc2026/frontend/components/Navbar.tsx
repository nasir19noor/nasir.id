import Link from 'next/link'

const links = [
  { href: '/',         label: 'Home' },
  { href: '/groups',   label: 'Groups' },
  { href: '/knockout', label: 'Knockout' },
  { href: '/scorers',  label: 'Top Scorers' },
  { href: '/squads',   label: 'Squads' },
  { href: '/admin',    label: 'Admin' },
]

export default function Navbar() {
  return (
    <header className="bg-pitch text-chalk shadow">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          ⚽ <span className="text-accent">WC&nbsp;2026</span>
        </Link>
        <nav className="ml-auto flex gap-4 text-sm font-medium">
          {links.map(l => (
            <Link key={l.href} href={l.href}
                  className="opacity-90 hover:text-accent hover:opacity-100">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
