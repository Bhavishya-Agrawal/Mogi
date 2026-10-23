export const formatDate = (value) =>
  new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export const formatClock = (totalSeconds) => {
  const s = Math.max(0, totalSeconds)
  return `${String(Math.floor(s / 60)).padStart(1, '0')}:${String(s % 60).padStart(2, '0')}`
}

export const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?'

export const STATUS_LABEL = {
  GENERATING: 'Preparing',
  IN_PROGRESS: 'In progress',
  EVALUATING: 'Grading',
  COMPLETED: 'Completed',
}
