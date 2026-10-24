import { useEffect, useState } from 'react'
import { LogoMark } from './Logo'

const messages = [
  'Reading your resume...',
  'Noting what you are proud of...',
  'Finding the follow-up questions you hoped nobody would ask...',
  'Writing your interview script...',
  'Almost ready. Take a breath.',
]

// Full-screen wait state while the server extracts the resume and Groq writes the script (10-40s)
export default function GeneratingOverlay() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, messages.length - 1)), 4500)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="dots fixed inset-0 z-50 grid place-items-center bg-paper px-6" role="status" aria-live="polite">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="animate-pulse"><LogoMark size={56} /></div>
        <h2 className="mt-6 text-2xl font-extrabold">Preparing your interview</h2>
        <p className="mt-2 min-h-12 text-ink-soft">{messages[step]}</p>
        <div className="mt-5 h-3 w-64 overflow-hidden rounded-full border-2 border-ink bg-sheet">
          <div className="h-full w-1/3 rounded-full bg-pen" style={{ animation: 'slide-bar 1.4s ease-in-out infinite' }} />
        </div>
        <p className="mt-6 text-sm text-ink-soft">This usually takes under a minute. Please keep this tab open.</p>
      </div>
    </div>
  )
}
