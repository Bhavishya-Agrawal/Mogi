import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Logo from './Logo'
import UserMenu from './UserMenu'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: 'Home' },
  { to: '/#about', label: 'About us' },
  { to: '/#contact', label: 'Contact' },
]

// Landing page header. Signed out: links + sign in. Signed in: links + profile menu.
export default function PublicNav() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <header className="relative z-30 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
      <Logo />

      <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
        {links.map((l) => (
          <Link key={l.label} to={l.to} className="rounded-full px-4 py-2 font-medium hover:bg-paper-deep">
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        {user ? (
          <UserMenu />
        ) : (
          <>
            <Link to="/login" className="btn btn-sm hidden md:inline-flex">Sign in</Link>
            <Link to="/register" className="btn btn-sm btn-pen hidden md:inline-flex">Sign up</Link>
            <button
              className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-sheet md:hidden"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </>
        )}
      </div>

      {open && !user && (
        <div className="absolute inset-x-5 top-[4.5rem] rounded-2xl border-2 border-ink bg-sheet p-3 shadow-[4px_4px_0_0_var(--color-ink)] md:hidden">
          {links.map((l) => (
            <Link key={l.label} to={l.to} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 font-medium hover:bg-paper-deep">
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex gap-2 border-t border-paper-deep pt-3">
            <Link to="/login" className="btn btn-sm flex-1">Sign in</Link>
            <Link to="/register" className="btn btn-sm btn-pen flex-1">Sign up</Link>
          </div>
        </div>
      )}
    </header>
  )
}
