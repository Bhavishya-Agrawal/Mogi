import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import PublicNav from '../components/PublicNav'
import PenCircle from '../components/PenCircle'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import { CONTACT_EMAIL } from '../config'

// A margin note written in red pen, with a little arrow pointing back at the line above
function Note({ children, delay = 0, className = '' }) {
  return (
    <p className={`note flex items-start gap-1.5 text-[1.65rem] ${className}`} style={{ '--d': `${delay}s` }}>
      <svg aria-hidden="true" width="30" height="24" viewBox="0 0 30 24" className="mt-0.5 shrink-0 overflow-visible">
        <path className="pen" pathLength="1" strokeWidth="2.2" style={{ '--d': `${delay}s` }} d="M27 21C15 21 6 15 4 4M4 4L3 12M4 4L12 7" />
      </svg>
      <span className="-rotate-2">{children}</span>
    </p>
  )
}

const Bar = ({ w }) => <div className="h-2.5 rounded-full bg-paper-deep" style={{ width: w }} />

// The hero visual: a resume with the interviewer's red pen already on it
function ResumeSheet() {
  return (
    <div className="relative mx-auto w-full max-w-md rotate-[1.5deg] rounded-md border-2 border-ink bg-sheet p-6 shadow-[8px_8px_0_0_var(--color-ink)] sm:p-8">
      <div className="mb-5 space-y-2">
        <div className="h-5 w-44 rounded-full bg-ink" />
        <Bar w="11rem" />
      </div>

      <h2 className="font-display text-lg font-bold">Projects</h2>
      <div className="mt-3 space-y-5">
        <div>
          <p className="font-semibold">Realtime chat app</p>
          <p className="mt-1 leading-relaxed text-ink-soft">
            Built with Node.js, Socket.io and{' '}
            <PenCircle delay={1.1}><span className="font-semibold text-ink">Redis</span></PenCircle>{' '}
            to serve{' '}
            <PenCircle delay={1.6}><span className="font-semibold text-ink">10k concurrent users</span></PenCircle>.
          </p>
          <Note delay={2.2} className="mt-3 pl-8">why Redis? what breaks without it?</Note>
        </div>

        <div>
          <p className="font-semibold">Inventory dashboard</p>
          <p className="mt-1 leading-relaxed text-ink-soft">
            Cut API latency by{' '}
            <PenCircle delay={2.9}><span className="font-semibold text-ink">40%</span></PenCircle>{' '}
            across all endpoints.
          </p>
          <Note delay={3.4} className="mt-3 pl-8">measured how?</Note>
        </div>
      </div>

      <h2 className="mt-6 font-display text-lg font-bold">Experience</h2>
      <div className="mt-3 space-y-2">
        <Bar w="70%" />
        <Bar w="85%" />
        <Bar w="55%" />
      </div>
    </div>
  )
}

const steps = [
  {
    title: 'Drop in your resume',
    body: 'Upload a PDF. Mogi reads it in memory and keeps your skills and projects, not the file.',
  },
  {
    title: 'Get questions about your own work',
    body: 'Seven questions written from your projects and your stack. No generic "what is a closure" round.',
  },
  {
    title: 'Answer like it is real',
    body: 'Some questions you speak, some you write, some you code in an editor that will not run anything. Every question has a clock.',
  },
  {
    title: 'Read your report card',
    body: 'A grade, a score and feedback for every answer, and a short list of what to study before the real thing.',
  },
]

export default function Home() {
  const { user } = useAuth()
  const { hash, key } = useLocation()

  // Smooth-scroll to #about / #contact when the nav links point here
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    else window.scrollTo(0, 0)
  }, [hash, key])

  return (
    <div>
      <div className="dots">
        <PublicNav />

        <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-8 md:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pb-28 lg:pt-14">
          <div>
            <h1 className="text-[clamp(2.6rem,7.2vw,5.4rem)] font-extrabold leading-[0.98] tracking-tight">
              Attend your first AI mock interview today.
            </h1>
            <div className="mt-9 flex flex-wrap gap-4">
              {user ? (
                <Link to="/dashboard" className="btn btn-pen">Go to your dashboard</Link>
              ) : (
                <>
                  <Link to="/register" className="btn btn-pen">Sign up</Link>
                  <Link to="/login" className="btn">Sign in</Link>
                </>
              )}
            </div>
          </div>

          <ResumeSheet />
        </section>
      </div>

      <section className="border-t-2 border-ink bg-sheet">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-24">
          <h2 className="text-4xl font-extrabold leading-tight sm:text-5xl">How a Mogi interview goes</h2>
          <ol className="space-y-9">
            {steps.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[3.2rem_1fr] gap-4">
                <span className="font-display text-5xl font-extrabold leading-none text-pen">{i + 1}</span>
                <div>
                  <h3 className="text-xl font-bold">{s.title}</h3>
                  <p className="mt-1.5 max-w-xl leading-relaxed text-ink-soft">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="about" className="scroll-mt-4 border-t-2 border-ink">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-24">
          <h2 className="text-4xl font-extrabold leading-tight sm:text-5xl">About Mogi</h2>
          <div className="max-w-xl space-y-5 text-lg leading-relaxed">
            <p>
              Mogi is a practice room for technical interviews. Most prep sites give you the same question list as
              everyone else. Mogi writes yours from your own resume and grades the answers the way an engineering
              manager would.
            </p>
            <dl className="space-y-4 border-t-2 border-ink pt-5 text-base">
              <div>
                <dt className="font-bold">Your PDF is never saved</dt>
                <dd className="text-ink-soft">It is read in memory, turned into notes on your skills and projects, then discarded.</dd>
              </div>
              <div>
                <dt className="font-bold">Your voice is not recorded</dt>
                <dd className="text-ink-soft">Your browser turns speech into text. Only the text of your answers is stored.</dd>
              </div>
              <div>
                <dt className="font-bold">Works best in Chrome or Edge</dt>
                <dd className="text-ink-soft">Those browsers support voice answers. In others you can type every answer.</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-4 border-t-2 border-ink bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 lg:py-24">
          <h2 className="text-4xl font-extrabold leading-tight sm:text-5xl">Found a bug or have feedback?</h2>
          <p className="mt-4 max-w-lg text-lg text-paper/75">Write to us and a human will read it.</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-8 inline-block break-all font-display text-2xl font-bold underline decoration-pen decoration-4 underline-offset-8 hover:text-white sm:text-4xl"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </section>

      <footer className="bg-ink pb-10 text-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-paper/20 px-5 pt-8 md:px-8">
          <div className="[&_span]:text-paper"><Logo /></div>
          <p className="text-sm text-paper/60">Practice interviews. Not a guarantee of any real one.</p>
        </div>
      </footer>
    </div>
  )
}
