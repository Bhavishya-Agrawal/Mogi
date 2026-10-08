import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, Minus } from 'lucide-react'
import api, { errorMessage } from '../lib/api'
import { formatDate } from '../lib/format'
import AppHeader from '../components/AppHeader'
import PenCircle from '../components/PenCircle'
import Splash from '../components/Splash'

const TYPE_LABEL = { VOICE: 'Spoken', TEXT: 'Written', CODE: 'Code' }

function Rating({ value }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label={`Rated ${value} out of 5`}>
      <span className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`h-3.5 w-3.5 rounded-full border-2 border-ink ${n <= value ? 'bg-ink' : ''}`} />
        ))}
      </span>
      <span className="font-display font-bold">{value}/5</span>
    </span>
  )
}

export default function Results() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [interview, setInterview] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get(`/interviews/${id}`)
      .then((res) => {
        const data = res.data.interview
        // Not graded yet: send them back to finish the interview first
        if (data.status !== 'COMPLETED' || !data.report) return navigate(`/interview/${id}`, { replace: true })
        setInterview(data)
      })
      .catch((err) => setError(errorMessage(err, 'Could not load this report card.')))
  }, [id, navigate])

  if (error) {
    return (
      <div className="min-h-dvh">
        <AppHeader />
        <p role="alert" className="p-8 font-medium text-pen-dark">{error}</p>
      </div>
    )
  }
  if (!interview) return <Splash />

  const { report, script } = interview

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-4xl space-y-14 px-5 py-10 sm:px-8 sm:py-14">
        <header className="grid items-center gap-8 sm:grid-cols-[auto_1fr] sm:gap-12">
          <div className="flex justify-center sm:block">
            <div className="-rotate-6 px-6 py-5">
              <PenCircle delay={0.3} strokeWidth={3}>
                <span className="block px-6 py-1 font-display text-[6.5rem] font-extrabold leading-none tracking-tight" aria-label={`Grade ${report.grade}`}>
                  {report.grade}
                </span>
              </PenCircle>
            </div>
          </div>
          <div>
            <p className="font-semibold text-ink-soft">{interview.title} &middot; {formatDate(interview.createdAt)}</p>
            <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Your report card</h1>
            <p className="mt-2 font-medium">
              Average {report.averageRating} out of 5 across {script.length} answers
            </p>
            <p className="mt-4 max-w-xl text-lg leading-relaxed">{report.summary}</p>
          </div>
        </header>

        <section className="grid gap-10 border-t-2 border-ink pt-10 md:grid-cols-2" aria-label="Strengths and gaps">
          <div>
            <h2 className="text-2xl font-bold">Strengths</h2>
            <ul className="mt-4 divide-y divide-paper-deep">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex gap-3 py-3 leading-relaxed">
                  <Check size={20} strokeWidth={3} className="mt-0.5 shrink-0" /> <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Gaps</h2>
            <ul className="mt-4 divide-y divide-paper-deep">
              {report.gaps.map((g, i) => (
                <li key={i} className="flex gap-3 py-3 leading-relaxed">
                  <Minus size={20} strokeWidth={3} className="mt-0.5 shrink-0 text-pen" /> <span>{g}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {report.roadmap.length > 0 && (
          <section className="rounded-3xl border-2 border-ink bg-sheet p-6 sm:p-9" aria-labelledby="roadmap-h">
            <h2 id="roadmap-h" className="text-2xl font-bold">What to study before the real one</h2>
            <ol className="mt-5 space-y-4">
              {report.roadmap.map((r, i) => (
                <li key={i} className="grid grid-cols-[2.2rem_1fr] gap-3 leading-relaxed">
                  <span className="font-display text-2xl font-extrabold leading-none text-pen">{i + 1}</span>
                  <span>{r}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section aria-labelledby="answers-h">
          <h2 id="answers-h" className="text-2xl font-bold">Answer by answer</h2>
          <ol className="mt-6 space-y-8">
            {script.map((q, i) => (
              <li key={i} className="border-t-2 border-ink pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink-soft">Question {i + 1} &middot; {TYPE_LABEL[q.type]}</p>
                  <Rating value={q.rating} />
                </div>
                <h3 className="mt-2 text-xl font-bold leading-snug">{q.questionText}</h3>
                <p className="mt-3 max-w-2xl leading-relaxed">{q.feedback}</p>
                <details className="group mt-4">
                  <summary className="cursor-pointer select-none font-semibold underline decoration-2 underline-offset-4 hover:text-pen-dark">
                    Show what you answered
                  </summary>
                  <div className="mt-3 rounded-2xl bg-ink px-5 py-4 text-paper">
                    {!q.userAnswer?.trim() ? (
                      <p className="italic text-paper/70">Skipped</p>
                    ) : q.type === 'CODE' ? (
                      <pre className="overflow-x-auto font-mono text-sm leading-relaxed">{q.userAnswer}</pre>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{q.userAnswer}</p>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ol>
        </section>

        <div className="flex justify-end border-t-2 border-ink pt-8">
          <Link to="/dashboard" className="btn btn-ink">Back to dashboard</Link>
        </div>
      </main>
    </div>
  )
}
