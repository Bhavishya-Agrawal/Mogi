import { Link } from 'react-router-dom'
import Logo from './Logo'

// Shared frame for the sign in / sign up pages: logo top-left, one card in the middle
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="dots min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <Logo />
        <Link to="/" className="rounded-full px-4 py-2 font-medium hover:bg-paper-deep">Back to home</Link>
      </header>
      <main className="mx-auto w-full max-w-md px-5 pb-16 pt-6">
        <div className="rounded-3xl border-2 border-ink bg-sheet p-7 shadow-[6px_6px_0_0_var(--color-ink)] sm:p-9">
          <h1 className="text-3xl font-extrabold">{title}</h1>
          {subtitle && <p className="mt-2 text-ink-soft">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
        <p className="mt-6 text-center text-ink-soft">{footer}</p>
      </main>
    </div>
  )
}
