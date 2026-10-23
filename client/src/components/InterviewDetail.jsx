import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Pencil, X } from 'lucide-react'
import api, { errorMessage } from '../lib/api'
import { formatDate, STATUS_LABEL } from '../lib/format'

const TYPE_LABEL = { VOICE: 'Spoken', TEXT: 'Written', CODE: 'Code' }

function RenameTitle({ title, onSave }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  async function save() {
    const next = value.trim()
    if (!next || next === title) {
      setEditing(false)
      setValue(title)
      return
    }
    try {
      await onSave(next)
      setEditing(false)
      setError('')
    } catch (err) {
      setError(errorMessage(err, 'Could not rename.'))
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="truncate text-3xl font-extrabold sm:text-4xl">{title}</h1>
        <button
          onClick={() => {
            setValue(title)
            setEditing(true)
          }}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-paper-deep hover:text-ink"
          aria-label="Rename interview"
        >
          <Pencil size={18} />
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          className="field max-w-sm font-display text-2xl font-bold"
          value={value}
          maxLength={40}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') {
              setEditing(false)
              setError('')
            }
          }}
          aria-label="Interview name"
        />
        <button onClick={save} className="grid h-10 w-10 place-items-center rounded-full bg-ink text-paper" aria-label="Save name"><Check size={18} /></button>
        <button onClick={() => setEditing(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-paper-deep" aria-label="Cancel"><X size={18} /></button>
      </div>
      {error && <p className="mt-2 font-medium text-pen-dark">{error}</p>}
    </div>
  )
}

const text = (v) => (typeof v === 'string' ? v : '')

// Main panel of the dashboard for one past interview: name, resume summary, transcript
export default function InterviewDetail({ id, onRenamed }) {
  const [interview, setInterview] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setInterview(null)
    setError('')
    api
      .get(`/interviews/${id}`)
      .then((res) => !cancelled && setInterview(res.data.interview))
      .catch((err) => !cancelled && setError(errorMessage(err, 'Could not load this interview.')))
    return () => {
      cancelled = true
    }
  }, [id])

  async function rename(title) {
    const { data } = await api.patch(`/interviews/${id}`, { title })
    setInterview((i) => ({ ...i, title: data.title }))
    onRenamed(id, data.title)
  }

  if (error) return <p role="alert" className="p-8 font-medium text-pen-dark">{error}</p>
  if (!interview) return <div className="mx-auto max-w-3xl animate-pulse space-y-4 p-8"><div className="h-10 w-64 rounded-xl bg-paper-deep" /><div className="h-32 rounded-2xl bg-paper-deep" /></div>

  const { resumeContext: ctx, script, report, status } = interview
  const answered = script.filter((q) => q.userAnswer !== null || q.voiceRecordingPending)

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-5 py-8 sm:px-8">
      <div>
        <RenameTitle title={interview.title} onSave={rename} />
        <p className="mt-2 text-ink-soft">
          {formatDate(interview.createdAt)} &middot; {STATUS_LABEL[status]}
          {report && <> &middot; Grade <span className="font-bold text-ink">{report.grade}</span></>}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {status === 'COMPLETED' ? (
            <Link to={`/results/${id}`} className="btn btn-ink">View report card</Link>
          ) : (
            <Link to={`/interview/${id}`} className="btn btn-pen">
              {answered.length ? 'Continue interview' : 'Start interview'}
            </Link>
          )}
        </div>
      </div>

      <section aria-labelledby="resume-h">
        <h2 id="resume-h" className="text-2xl font-bold">Resume</h2>
        <div className="mt-4 space-y-6 rounded-2xl border-2 border-ink bg-sheet p-5 sm:p-6">
          <div>
            <h3 className="font-bold">Skills</h3>
            {ctx.skills?.length ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {ctx.skills.map((s) => (
                  <li key={s} className="rounded-full border-2 border-ink bg-paper px-3 py-0.5 text-sm font-medium">{s}</li>
                ))}
              </ul>
            ) : <p className="mt-1 text-ink-soft">No skills were found on the resume.</p>}
          </div>
          <div>
            <h3 className="font-bold">Projects</h3>
            {ctx.projects?.length ? (
              <ul className="mt-2 space-y-3">
                {ctx.projects.map((p, i) => (
                  <li key={i}>
                    <p className="font-semibold">{text(p?.name) || 'Untitled project'}</p>
                    <p className="text-ink-soft">{text(p?.description)}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-1 text-ink-soft">No projects were found on the resume.</p>}
          </div>
          <div>
            <h3 className="font-bold">Experience</h3>
            {ctx.experience?.length ? (
              <ul className="mt-2 space-y-2">
                {ctx.experience.map((x, i) => (
                  <li key={i}>
                    <span className="font-semibold">{text(x?.role)}</span>
                    {text(x?.company) && <> at {x.company}</>}
                    {text(x?.duration) && <span className="text-ink-soft"> ({x.duration})</span>}
                  </li>
                ))}
              </ul>
            ) : <p className="mt-1 text-ink-soft">No work experience was found on the resume.</p>}
          </div>
        </div>
      </section>

      <section aria-labelledby="transcript-h">
        <h2 id="transcript-h" className="text-2xl font-bold">Interview</h2>
        {answered.length === 0 ? (
          <p className="mt-3 text-ink-soft">Nothing here yet. Your questions and answers will appear once you start.</p>
        ) : (
          <div className="mt-4 space-y-5">
            {answered.map((q, i) => (
              <div key={i} className="space-y-3">
                <div className="max-w-[92%] rounded-2xl rounded-tl-sm border-2 border-ink bg-sheet px-5 py-4">
                  <p className="text-sm font-semibold text-ink-soft">Interviewer &middot; {TYPE_LABEL[q.type]}</p>
                  <p className="mt-1 font-medium">{q.questionText}</p>
                </div>
                <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-sm bg-ink px-5 py-4 text-paper">
                  <p className="text-sm font-semibold text-paper/60">You</p>
                  {q.voiceRecordingPending ? (
                    <p className="mt-1 italic text-paper/70">Voice answer saved on this device. Continue the interview to transcribe it.</p>
                  ) : !q.userAnswer?.trim() ? (
                    <p className="mt-1 italic text-paper/70">Skipped</p>
                  ) : q.type === 'CODE' ? (
                    <pre className="mt-1 overflow-x-auto font-mono text-sm leading-relaxed">{q.userAnswer}</pre>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed">{q.userAnswer}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
