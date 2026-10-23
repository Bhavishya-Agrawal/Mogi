import { Link } from 'react-router-dom'

export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#0B2027" />
      <path
        d="M14 46V26c0-4 3-7 7-7s7 3 7 7v20M28 30c0-4 3-7 7-7s7 3 7 7v16"
        fill="none"
        stroke="#EDF2F4"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="51" cy="14" r="6" fill="#EF233C" stroke="#EDF2F4" strokeWidth="3" />
    </svg>
  )
}

export default function Logo({ to = '/', className = '' }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Mogi home">
      <LogoMark />
      <span className="font-display text-2xl font-extrabold tracking-tight">mogi</span>
    </Link>
  )
}
