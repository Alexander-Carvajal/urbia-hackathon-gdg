import { Link } from 'react-router-dom'

/** Isotipo: edificios + palmera + ola. */
export function BrandMark({ size = 44, onDark = false }: { size?: number; onDark?: boolean }) {
  const id = onDark ? 'bm-d' : 'bm-l'
  return (
    <svg width={size} height={size * 0.86} viewBox="0 0 56 48" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={onDark ? '#7CC8FF' : '#2C92F3'} />
          <stop offset="1" stopColor={onDark ? '#2C92F3' : '#0B57B8'} />
        </linearGradient>
        <linearGradient id={`${id}-w`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2BB5F0" />
          <stop offset="1" stopColor="#1A82E8" />
        </linearGradient>
      </defs>
      {/* edificios */}
      <rect x="6" y="22" width="7" height="16" rx="1.2" fill={`url(#${id}-b)`} />
      <rect x="14.5" y="12" width="8" height="26" rx="1.2" fill={`url(#${id}-b)`} />
      <rect x="24" y="4" width="8" height="34" rx="1.2" fill={`url(#${id}-b)`} />
      <rect x="33.5" y="16" width="6" height="22" rx="1.2" fill={`url(#${id}-b)`} />
      {[0, 1, 2, 3].map((i) => <rect key={i} x="26.3" y={8 + i * 6} width="3.4" height="2" rx=".5" fill="#fff" opacity=".75" />)}
      {[0, 1, 2].map((i) => <rect key={i} x="16.8" y={16 + i * 6} width="3.4" height="2" rx=".5" fill="#fff" opacity=".7" />)}
      {/* palmera */}
      <path d="M45 38c.6-7 .2-12-1.5-17" stroke={onDark ? '#BFE6FF' : '#0B2A4E'} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M43.6 21c-3.5-2.6-7.5-2.4-9.6-.6 3.3-.3 6 .5 9.6.6zM43.6 21c1.2-4 4.5-6 7.6-5.7-2.7 1.3-4.6 3-7.6 5.7zM43.6 21c3.8-1.7 7.7-.6 9.4 1.7-3.1-.9-5.9-.9-9.4-1.7zM43.6 21c-1.4-3.6-.6-7 1.6-8.6-.7 2.9-.9 5.4-1.6 8.6z" fill="#2BB5F0" />
      {/* ola */}
      <path d="M2 42c4.5 0 6-3.5 11-3.5S20 42 25 42s7-3.5 12-3.5S44 42 49 42c2.6 0 4-1 5-2" stroke={`url(#${id}-w)`} strokeWidth="3.2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function Logo({ compact = false, onDark = false, to = '/' }: { compact?: boolean; onDark?: boolean; to?: string }) {
  return (
    <Link to={to} className="flex shrink-0 items-center gap-2 rounded-xl" aria-label="URBIA Cancún, ir al inicio">
      <BrandMark size={compact ? 36 : 46} onDark={onDark} />
      {!compact && (
        <span className="flex flex-col font-display font-extrabold leading-[0.95] tracking-[0.01em]">
          <span className={`text-[21px] ${onDark ? 'text-white' : 'text-navy'}`}>URBIA</span>
          <span className={`text-[19px] ${onDark ? 'text-[#7CC8FF]' : 'text-primary'}`}>Cancún</span>
        </span>
      )}
    </Link>
  )
}

/** Ola decorativa para el pie de la barra lateral. */
export function SidebarWaves() {
  return (
    <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full" viewBox="0 0 240 96" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 52c30-14 60-14 90 0s60 14 90 0 45-12 60-6v50H0z" fill="#DCEEFC" opacity=".7" />
      <path d="M0 68c35-12 70-12 105 0s70 12 105 0c12-4 22-5 30-4v32H0z" fill="#BFE0FA" opacity=".8" />
    </svg>
  )
}
