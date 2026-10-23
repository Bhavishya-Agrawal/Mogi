import Logo from './Logo'
import UserMenu from './UserMenu'

// Slim header for signed-in pages that don't have the dashboard sidebar
export default function AppHeader({ children }) {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b-2 border-ink bg-paper px-4 md:px-8">
      <Logo to="/dashboard" />
      {children}
      <UserMenu />
    </header>
  )
}
