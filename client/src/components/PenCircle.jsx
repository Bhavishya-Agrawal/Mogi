// Wraps content in a hand-drawn red circle that draws itself once, like a marker on paper.
export default function PenCircle({ children, delay = 0, className = '', strokeWidth = 2.5 }) {
  return (
    <span className={`relative inline-block ${className}`}>
      {children}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-2.5 -inset-y-1.5 h-[calc(100%+0.75rem)] w-[calc(100%+1.25rem)] overflow-visible"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
      >
        <path
          className="pen"
          pathLength="1"
          strokeWidth={strokeWidth}
          style={{ '--d': `${delay}s` }}
          d="M14 24C10 10 40 4 66 5C92 6 99 18 92 29C85 38 48 38 24 34C8 31 4 18 20 10"
        />
      </svg>
    </span>
  )
}
