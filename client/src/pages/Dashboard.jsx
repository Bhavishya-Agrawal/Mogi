import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronsLeft, ChevronsRight, Plus, Search } from 'lucide-react'
import api from '../lib/api'
import { formatDate } from '../lib/format'
import Logo from '../components/Logo'
import UserMenu from '../components/UserMenu'
import UploadPanel from '../components/UploadPanel'
import InterviewDetail from '../components/InterviewDetail'

const dot = {
  COMPLETED: 'bg-ink',
  IN_PROGRESS: 'bg-pen',
  EVALUATING: 'bg-pen',
  GENERATING: 'bg-pen',
}

export default function Dashboard() {
  const { id } = useParams()
  const [interviews, setInterviews] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const decided = useRef(false)

  useEffect(() => {
    api
      .get('/interviews')
      .then((res) => {
        setInterviews(res.data.interviews)
        // The sidebar opens by itself once there is history (desktop only; on phones it is a drawer)
        if (!decided.current) {
          decided.current = true
          if (res.data.interviews.length && window.matchMedia('(min-width: 768px)').matches) setOpen(true)
        }
      })
      .finally(() => setLoaded(true))
  }, [])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return interviews
    return interviews.filter(
      (i) => i.title.toLowerCase().includes(q) || i.resumeContext?.skills?.some((s) => s.toLowerCase().includes(q))
    )
  }, [interviews, query])

  const onRenamed = (interviewId, title) =>
    setInterviews((list) => list.map((i) => (i._id === interviewId ? { ...i, title } : i)))

  const closeOnMobile = () => window.matchMedia('(max-width: 767px)').matches && setOpen(false)

  return (
    <div className="flex h-dvh overflow-hidden">
      {open && <div className="fixed inset-0 z-30 bg-ink/40 md:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside
        aria-label="Interview history"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r-2 border-ink bg-sheet transition-transform duration-200 md:static md:transition-none ${
          open ? 'translate-x-0' : '-translate-x-full md:hidden'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-4">
          <Logo to="/dashboard" />
          <button
            onClick={() => setOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-paper-deep"
            aria-label="Collapse sidebar"
          >
            <ChevronsLeft size={20} />
          </button>
        </div>

        <div className="space-y-3 px-4 pb-3">
          <Link to="/dashboard" onClick={closeOnMobile} className="btn btn-sm btn-pen w-full"><Plus size={16} /> New interview</Link>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              className="field py-2 pl-9 text-sm"
              placeholder="Search interviews"
              aria-label="Search interviews"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4" aria-label="Past interviews">
          {!loaded ? null : interviews.length === 0 ? (
            <p className="px-3 py-4 text-sm text-ink-soft">No interviews yet. Upload a resume to start your first one.</p>
          ) : visible.length === 0 ? (
            <p className="px-3 py-4 text-sm text-ink-soft">Nothing matches &ldquo;{query}&rdquo;.</p>
          ) : (
            <ul className="space-y-1">
              {visible.map((i) => {
                const active = i._id === id
                return (
                  <li key={i._id}>
                    <Link
                      to={`/dashboard/${i._id}`}
                      onClick={closeOnMobile}
                      aria-current={active ? 'page' : undefined}
                      className={`block rounded-xl px-3 py-2.5 ${active ? 'bg-ink text-paper' : 'hover:bg-paper-deep'}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${active ? (i.status === 'COMPLETED' ? 'bg-paper' : 'bg-pen') : dot[i.status]}`} />
                        <span className="truncate font-semibold">{i.title}</span>
                      </span>
                      <span className={`mt-0.5 block truncate pl-[1.1rem] text-sm ${active ? 'text-paper/65' : 'text-ink-soft'}`}>
                        {formatDate(i.createdAt)}
                        {i.resumeContext?.skills?.length > 0 && ` · ${i.resumeContext.skills.slice(0, 3).join(', ')}`}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b-2 border-ink px-4 md:px-6">
          <div className="flex items-center gap-2">
            {!open && (
              <>
                <Logo to="/dashboard" />
                <button
                  onClick={() => setOpen(true)}
                  className="grid h-9 w-9 place-items-center rounded-full hover:bg-paper-deep"
                  aria-label="Open sidebar"
                >
                  <ChevronsRight size={20} />
                </button>
              </>
            )}
          </div>
          <UserMenu />
        </header>

        <main className="flex-1 overflow-y-auto">
          {id ? (
            <InterviewDetail key={id} id={id} onRenamed={onRenamed} />
          ) : (
            <UploadPanel hasHistory={interviews.length > 0} />
          )}
        </main>
      </div>
    </div>
  )
}
