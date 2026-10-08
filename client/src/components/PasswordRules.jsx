import { Check, Circle } from 'lucide-react'

export const passwordChecks = (pw) => [
  { label: 'At least 8 characters', ok: pw.length >= 8 },
  { label: 'At least one letter', ok: /[A-Za-z]/.test(pw) },
  { label: 'At least one number', ok: /\d/.test(pw) },
]

export default function PasswordRules({ password }) {
  return (
    <ul className="space-y-1.5 text-sm" aria-label="Password requirements">
      {passwordChecks(password).map((c) => (
        <li key={c.label} className={`flex items-center gap-2 ${c.ok ? 'font-semibold text-ink' : 'text-ink-soft'}`}>
          {c.ok ? <Check size={16} className="text-pen" strokeWidth={3} /> : <Circle size={16} />}
          {c.label}
        </li>
      ))}
    </ul>
  )
}
