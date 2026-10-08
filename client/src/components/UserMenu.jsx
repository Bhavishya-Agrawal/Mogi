import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Mail, Settings, House } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { initials } from '../lib/format'

// The profile picture (initials) that opens the account menu: settings, contact, home, sign out
export default function UserMenu() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const item = 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left font-medium hover:bg-paper-deep'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-ink font-display text-sm font-bold text-paper transition hover:bg-pen"
      >
        {initials(user?.name)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 rounded-2xl border-2 border-ink bg-sheet p-2 shadow-[4px_4px_0_0_var(--color-ink)]"
        >
          <div className="border-b border-paper-deep px-3 pb-2 pt-1">
            <p className="truncate font-display font-bold">{user?.name}</p>
            <p className="truncate text-sm text-ink-soft">{user?.email}</p>
          </div>
          <div className="pt-1" onClick={() => setOpen(false)}>
            <Link role="menuitem" to="/dashboard" className={item}><LayoutDashboard size={18} /> Dashboard</Link>
            <Link role="menuitem" to="/settings" className={item}><Settings size={18} /> Settings</Link>
            <Link role="menuitem" to="/#contact" className={item}><Mail size={18} /> Contact</Link>
            <Link role="menuitem" to="/" className={item}><House size={18} /> Home</Link>
            <button
              role="menuitem"
              className={`${item} text-pen-dark`}
              onClick={() => {
                signOut()
                navigate('/')
              }}
            >
              <LogOut size={18} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
