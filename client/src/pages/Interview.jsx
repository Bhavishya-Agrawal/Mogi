import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Editor, { loader as monacoLoader } from '@monaco-editor/react'
import { Clock, Keyboard, Mic, RotateCcw, Square, Volume2 } from 'lucide-react'
import api, { errorMessage } from '../lib/api'
import { formatClock } from '../lib/format'
import { speak, stopSpeaking, canSpeak } from '../lib/speech'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import { deleteVoiceRecording, getVoiceRecording } from '../lib/voiceRecordings'
import AppHeader from '../components/AppHeader'
import Splash from '../components/Splash'
import { LogoMark } from '../components/Logo'

const TYPE_HELP = {
  VOICE: 'Answer out loud. Click the mic to start, click it again when you are done.',
  TEXT: 'Write your answer. Structure helps: lists, field names, steps.',
  CODE: 'Whiteboard mode. Your code will not run, so trace it in your head.',
}

// Monaco theme that matches the app palette
function defineTheme(monaco) {
  monaco.editor.defineTheme('mogi', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6E8791', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'FF6B7D' },
      { token: 'string', foreground: '9ADBC0' },
      { token: 'number', foreground: 'F2C078' },
    ],
    colors: {
      'editor.background': '#0B2027',
      'editor.lineHighlightBackground': '#12303A',
      'editorLineNumber.foreground': '#4B636B',
      'editorCursor.foreground': '#EF233C',
      'editor.selectionBackground': '#2B4A55',
    },
  })
}

// No autocomplete or hints: this is meant to feel like a whiteboard
const EDITOR_OPTIONS = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  padding: { top: 14, bottom: 14 },
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  wordBasedSuggestions: 'off',
  parameterHints: { enabled: false },
  hover: { enabled: false },
  tabCompletion: 'off',
  codeLens: false,
}

function Waiting({ title, children }) {
  return (
    <div className="dots grid min-h-dvh place-items-center px-6">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="animate-pulse"><LogoMark size={56} /></div>
        <h1 className="mt-6 text-2xl font-extrabold">{title}</h1>
        {children}
      </div>
    </div>
  )
}

export default function Interview() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [phase, setPhase] = useState('loading') // loading | intro | live | grading | finishFailed | failed
  const [interview, setInterview] = useState(null)
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [useTypedVoiceAnswer, setUseTypedVoiceAnswer] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [timerOn, setTimerOn] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [finishProgress, setFinishProgress] = useState('')
  const [missingRecordingIndex, setMissingRecordingIndex] = useState(null)

  const savingRef = useRef(false)
  const submitRef = useRef(() => {})
  const script = interview?.script || []
  const q = script[index]
  const voiceRecorder = useVoiceRecorder(id, index)
  const voiceMode = q?.type === 'VOICE' && voiceRecorder.supported && !useTypedVoiceAnswer

  // 1. Load the interview
  useEffect(() => {
    api
      .get(`/interviews/${id}`)
      .then((res) => {
        const data = res.data.interview
        if (data.status === 'COMPLETED') return navigate(`/results/${id}`, { replace: true })
        const firstOpen = data.script.findIndex(
          (item) => item.userAnswer === null && !item.voiceRecordingPending
        )
        setInterview(data)
        setIndex(firstOpen === -1 ? data.script.length - 1 : firstOpen)
        setPhase('intro')
      })
      .catch((err) => {
        setError(errorMessage(err, 'Could not load this interview.'))
        setPhase('failed')
      })
  }, [id, navigate])

  useEffect(() => {
    if (phase !== 'intro' || !script.some((question) => question.type === 'CODE')) return
    monacoLoader.init().then(defineTheme).catch((error) => {
      console.error('Monaco editor preload error:', error)
    })
  }, [phase, script])

  // 2. Every new question: reset inputs, read the question aloud, start the clock when the reading ends
  useEffect(() => {
    if (phase !== 'live') return
    const question = script[index]
    setTyped(question.type === 'CODE' ? question.starterCode || '' : '')
    setUseTypedVoiceAnswer(false)
    setRemaining(question.timeLimitSeconds)
    setTimerOn(false)
    setError('')

    let active = true // a cancelled utterance fires its callbacks late; ignore those
    const begin = () => {
      if (!active) return
      setSpeaking(false)
      setTimerOn(true)
    }
    setSpeaking(canSpeak)
    speak(`${question.transition} ${question.questionText}`, begin)

    return () => {
      active = false
      stopSpeaking()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index])

  // 3. Countdown
  useEffect(() => {
    if (phase !== 'live' || !timerOn) return
    const t = setInterval(() => setRemaining((r) => r - 1), 1000)
    return () => clearInterval(t)
  }, [phase, timerOn, index])

  useEffect(() => {
    if (phase === 'live' && timerOn && remaining <= 0) submitRef.current()
  }, [phase, timerOn, remaining])

  async function finish(scriptToFinish = script) {
    setPhase('grading')
    setError('')
    try {
      let currentScript = scriptToFinish
      const recordings = currentScript
        .map((question, questionIndex) => ({ question, questionIndex }))
        .filter(({ question }) => question.type === 'VOICE' && question.voiceRecordingPending)
      setFinishProgress(recordings.length ? `Transcribing saved voice answers (0/${recordings.length})...` : 'Grading your interview...')

      for (let i = 0; i < recordings.length; i++) {
        const { questionIndex } = recordings[i]
        const recording = await getVoiceRecording(id, questionIndex)
        if (!recording?.blob?.size) {
          setMissingRecordingIndex(questionIndex)
          throw new Error(`The saved audio for voice question ${questionIndex + 1} is missing from this browser. Return to that question and record it again.`)
        }

        const form = new FormData()
        const mimeType = recording.mimeType || recording.blob.type || ''
        const extension = mimeType.includes('mp4')
          ? 'mp4'
          : mimeType.includes('ogg')
            ? 'ogg'
            : 'webm'
        form.append('audio', recording.blob, `voice-answer.${extension}`)
        const { data } = await api.post(
          `/interviews/${id}/answers/${questionIndex}/transcribe`,
          form
        )
        await deleteVoiceRecording(id, questionIndex)

        currentScript = currentScript.map((question, j) =>
          j === questionIndex
            ? { ...question, userAnswer: data.transcript, voiceRecordingPending: false }
            : question
        )
        setInterview((current) => ({ ...current, script: currentScript }))
        setMissingRecordingIndex(null)
        setFinishProgress(`Transcribing saved voice answers (${i + 1}/${recordings.length})...`)
      }

      setFinishProgress('Grading your interview...')
      await api.post(`/interviews/${id}/finish`)
      navigate(`/results/${id}`, { replace: true })
    } catch (err) {
      setError(err.response ? errorMessage(err, 'Could not finish the interview.') : err.message)
      setPhase('finishFailed')
    }
  }

  async function submit() {
    if (savingRef.current || phase !== 'live') return
    savingRef.current = true
    setSaving(true)
    setTimerOn(false)
    setError('')
    stopSpeaking()

    try {
      let answer = typed
      let voiceRecordingPending = false
      if (voiceMode) {
        if (voiceRecorder.recording) await voiceRecorder.stop()
        const recording = await voiceRecorder.getRecording()
        voiceRecordingPending = !!recording?.blob?.size
        answer = ''
      }
      await api.put(`/interviews/${id}/answers/${index}`, {
        userAnswer: voiceRecordingPending ? null : answer.trim(),
        voiceRecordingPending,
        timeTakenSeconds: Math.max(0, q.timeLimitSeconds - remaining),
      })
      if (q.type === 'VOICE' && !voiceRecordingPending && typeof indexedDB !== 'undefined') {
        await deleteVoiceRecording(id, index)
      }

      const updatedScript = script.map((question, questionIndex) =>
        questionIndex === index
          ? {
              ...question,
              userAnswer: voiceRecordingPending ? null : answer.trim(),
              voiceRecordingPending,
            }
          : question
      )
      setInterview((current) => ({ ...current, script: updatedScript }))

      if (updatedScript.every((question) => question.userAnswer !== null || question.voiceRecordingPending)) {
        await finish(updatedScript)
      } else {
        setIndex(index + 1)
      }
    } catch (err) {
      setError(err.response ? errorMessage(err, 'Could not save your answer.') : err.message)
      setTimerOn(false) // do not auto-submit in a loop if saving keeps failing
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }
  submitRef.current = submit

  // ---------- screens ----------

  if (phase === 'loading') return <Splash />

  if (phase === 'failed') {
    return (
      <Waiting title="We could not open this interview">
        <p role="alert" className="mt-2 text-pen-dark">{error}</p>
        <button className="btn mt-6" onClick={() => navigate('/dashboard')}>Back to dashboard</button>
      </Waiting>
    )
  }

  if (phase === 'grading') {
    return (
      <Waiting title={finishProgress.startsWith('Transcribing') ? 'Transcribing your answers' : 'Grading your answers'}>
        <p className="mt-2 text-ink-soft">{finishProgress || 'Preparing your report...'}</p>
        {finishProgress.startsWith('Transcribing') && (
          <p className="mt-2 text-ink-soft">Your saved recordings are sent to Groq for transcription now. This can take a few minutes.</p>
        )}
        <div className="mt-5 h-3 w-64 overflow-hidden rounded-full border-2 border-ink bg-sheet">
          <div className="h-full w-1/3 rounded-full bg-pen" style={{ animation: 'slide-bar 1.4s ease-in-out infinite' }} />
        </div>
      </Waiting>
    )
  }

  if (phase === 'finishFailed') {
    return (
      <Waiting title="Interview could not be finished">
        <p role="alert" className="mt-2 text-pen-dark">{error}</p>
        <p className="mt-2 text-ink-soft">Completed transcriptions are saved. Recordings that still need transcription remain on this device.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button className="btn btn-pen" onClick={() => finish()}>Retry finishing</button>
          {missingRecordingIndex !== null && (
            <button
              className="btn btn-ink"
              onClick={() => {
                setIndex(missingRecordingIndex)
                setPhase('live')
              }}
            >
              Return to question {missingRecordingIndex + 1}
            </button>
          )}
        </div>
      </Waiting>
    )
  }

  if (phase === 'intro') {
    const done = script.filter((item) => item.userAnswer !== null || item.voiceRecordingPending).length
    const allDone = done === script.length
    const minutes = Math.round(script.reduce((sum, item) => sum + item.timeLimitSeconds, 0) / 60)
    return (
      <div className="min-h-dvh">
        <AppHeader />
        <main className="mx-auto max-w-2xl px-5 py-10">
          <div className="rounded-3xl border-2 border-ink bg-sheet p-7 shadow-[6px_6px_0_0_var(--color-ink)] sm:p-10">
            <h1 className="text-3xl font-extrabold sm:text-4xl">
              {done === 0 ? 'Ready when you are' : allDone ? 'All questions answered' : 'Pick up where you stopped'}
            </h1>
            <p className="mt-3 text-ink-soft">
              {script.length} questions, up to {minutes} minutes in total. {done > 0 && !allDone && `You have answered ${done} so far.`}
            </p>
            <ul className="mt-6 space-y-3 leading-relaxed">
              <li className="flex gap-3"><Volume2 className="mt-1 shrink-0" size={20} /> Questions are read aloud. Turn your sound on.</li>
              <li className="flex gap-3">
                {voiceRecorder.supported ? <Mic className="mt-1 shrink-0" size={20} /> : <Keyboard className="mt-1 shrink-0" size={20} />}
                {voiceRecorder.supported
                  ? 'Spoken answers are saved on this device and transcribed when you finish. Your browser will ask for microphone permission.'
                  : 'Voice recording is not supported in this browser, so you will type spoken answers instead.'}
              </li>
              <li className="flex gap-3"><Clock className="mt-1 shrink-0" size={20} /> Each question has its own timer. When it runs out, your answer is submitted.</li>
            </ul>
            <button className="btn btn-pen mt-8" onClick={() => (allDone ? finish() : setPhase('live'))}>
              {allDone ? 'Get my report card' : done === 0 ? 'Start interview' : 'Continue interview'}
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ---------- live question ----------
  const total = script.length
  const isLast = index === total - 1
  const low = timerOn && remaining <= 15
  const pct = Math.max(0, Math.min(100, (remaining / q.timeLimitSeconds) * 100))

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />

      <div className="h-2 w-full bg-paper-deep" role="progressbar" aria-label="Time left for this question" aria-valuemin={0} aria-valuemax={q.timeLimitSeconds} aria-valuenow={Math.max(remaining, 0)}>
        <div className={`h-full transition-[width] duration-1000 ease-linear ${low ? 'bg-pen' : 'bg-ink'}`} style={{ width: `${pct}%` }} />
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-6 sm:py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-display text-lg font-bold">Question {index + 1} of {total}</p>
            <div className="mt-2 flex gap-1.5" aria-hidden="true">
              {script.map((_, i) => (
                <span key={i} className={`h-2 w-7 rounded-full border-2 border-ink ${i < index ? 'bg-ink' : i === index ? 'bg-pen' : 'bg-transparent'}`} />
              ))}
            </div>
          </div>
          <div
            className={`flex items-center gap-2 rounded-full border-2 border-ink px-4 py-1.5 font-display text-xl font-bold tabular-nums ${low ? 'bg-pen text-white' : 'bg-sheet'}`}
            aria-live="off"
          >
            <Clock size={18} /> {formatClock(remaining)}
          </div>
        </div>

        <section className="mt-6 rounded-3xl border-2 border-ink bg-sheet p-6 sm:p-8" aria-label="Question">
          <p className="italic text-ink-soft">{q.transition}</p>
          <h1 className="mt-3 text-2xl font-bold leading-snug sm:text-3xl">{q.questionText}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            {canSpeak && (
              <button onClick={() => speak(`${q.transition} ${q.questionText}`)} className="inline-flex items-center gap-2 font-semibold underline decoration-2 underline-offset-4 hover:text-pen-dark">
                <RotateCcw size={16} /> Hear it again
              </button>
            )}
            <span className="text-sm text-ink-soft">{speaking ? 'Reading the question. Your timer starts after.' : TYPE_HELP[q.type]}</span>
          </div>
        </section>

        <section className="mt-5" aria-label="Your answer">
          {voiceMode ? (
            <div className="rounded-3xl border-2 border-ink bg-sheet p-6">
              <div className="flex flex-col items-center">
                <div className="relative grid h-24 w-24 place-items-center">
                  {voiceRecorder.recording && <span className="absolute inset-0 rounded-full bg-pen" style={{ animation: 'rec-ring 1.4s ease-out infinite' }} />}
                  <button
                    onClick={() => {
                      if (voiceRecorder.recording) voiceRecorder.stop().catch(() => {})
                      else voiceRecorder.start()
                    }}
                    disabled={saving || voiceRecorder.starting}
                    className={`relative grid h-20 w-20 place-items-center rounded-full border-2 border-ink text-white shadow-[3px_3px_0_0_var(--color-ink)] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${voiceRecorder.recording ? 'bg-pen' : 'bg-ink'}`}
                    aria-label={voiceRecorder.recording ? 'Stop recording' : 'Start recording'}
                  >
                    {voiceRecorder.recording ? <Square size={26} fill="currentColor" /> : <Mic size={30} />}
                  </button>
                </div>
                <p className="mt-3 font-semibold" aria-live="polite">
                  {voiceRecorder.starting
                    ? 'Starting microphone...'
                    : voiceRecorder.recording
                      ? 'Recording. Click to save this answer.'
                      : voiceRecorder.hasRecording
                        ? 'Recording saved on this device. Record again to replace it.'
                        : 'Click the mic and start talking.'}
                </p>
              </div>
              <p className="mt-4 text-center text-sm text-ink-soft">Your audio stays in this browser until it is transcribed after you finish the interview, then it is deleted.</p>
              {voiceRecorder.error && <p role="alert" className="mt-3 text-center font-medium text-pen-dark">{voiceRecorder.error}</p>}
              <button
                className="mx-auto mt-3 block font-semibold underline"
                onClick={() => setUseTypedVoiceAnswer(true)}
              >
                Type this answer instead
              </button>
            </div>
          ) : q.type === 'CODE' ? (
            <div className="h-[420px] overflow-hidden rounded-2xl border-2 border-ink bg-ink">
              <Editor
                height="100%"
                language={q.language || 'javascript'}
                theme="mogi"
                value={typed}
                beforeMount={defineTheme}
                onChange={(value) => setTyped(value ?? '')}
                options={EDITOR_OPTIONS}
                loading={<span className="text-paper/70">Loading editor...</span>}
              />
            </div>
          ) : (
            <>
              {q.type === 'VOICE' && (
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-soft">
                  <p>{voiceRecorder.error || 'Voice recording is not supported in this browser.'} Type your answer instead.</p>
                  {voiceRecorder.supported && (
                    <button className="font-semibold underline" onClick={() => setUseTypedVoiceAnswer(false)}>
                      Record voice answer
                    </button>
                  )}
                </div>
              )}
              <textarea
                className="field min-h-64 resize-y leading-relaxed"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Type your answer here."
                aria-label="Your answer"
                spellCheck
              />
            </>
          )}
        </section>

        {error && <p role="alert" className="mt-4 rounded-xl border-2 border-pen bg-pen/10 px-4 py-3 font-medium text-pen-dark">{error}</p>}

        <div className="mt-6 flex justify-end">
          <button onClick={submit} disabled={saving} className={`btn ${isLast ? 'btn-pen' : 'btn-ink'}`}>
            {saving ? 'Saving...' : isLast ? 'Finish interview' : 'Next question'}
          </button>
        </div>
      </main>
    </div>
  )
}
