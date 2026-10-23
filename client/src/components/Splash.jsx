import { LogoMark } from './Logo'

export default function Splash({ label }) {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-pulse"><LogoMark size={48} /></div>
        {label && <p className="font-medium text-ink-soft">{label}</p>}
      </div>
    </div>
  )
}
