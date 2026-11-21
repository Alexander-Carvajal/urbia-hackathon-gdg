import { Award, Lock, Trophy } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../components/ui/Toast'
import { useReports } from '../reports/store'
import { BADGES, computeRewards, LEVELS, type RewardState } from './rewards'

export function useRewards(): RewardState {
  const { reports, user } = useReports()
  return useMemo(() => computeRewards(reports, user.id), [reports, user.id])
}

const SEEN_KEY = 'urbia-cancun:rewards-seen'

/** Avisa con un toast cuando se ganan puntos, se sube de nivel o se desbloquea una insignia. */
export function RewardWatcher() {
  const r = useRewards()
  const { ready, user } = useReports()
  const toast = useToast()
  const first = useRef(true)
  useEffect(() => {
    if (!ready) return
    const key = `${SEEN_KEY}:${user.id}`
    let prev: { points: number; level: number; badges: string[] } | null = null
    try { prev = JSON.parse(localStorage.getItem(key) ?? 'null') } catch { /* sin almacenamiento */ }
    const cur = { points: r.points, level: r.level.n, badges: r.earnedIds }
    try { localStorage.setItem(key, JSON.stringify(cur)) } catch { /* noop */ }
    const wasFirst = first.current
    first.current = false
    if (!prev || wasFirst) return
    const newBadges = cur.badges.filter((b) => !prev!.badges.includes(b))
    if (cur.level > prev.level) toast(`¡Subiste a nivel ${cur.level}: ${r.level.name}!`)
    for (const id of newBadges) { const b = BADGES.find((x) => x.id === id); if (b) toast(`Nueva insignia: ${b.emoji} ${b.name}`) }
    if (cur.points > prev.points && cur.level === prev.level && !newBadges.length) toast(`+${cur.points - prev.points} puntos de participación`, 'info')
  }, [r, toast, ready, user.id])
  return null
}

export function LevelPill() {
  const r = useRewards()
  return (
    <Link to="/perfil" className="hidden h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-line bg-white px-3 text-sm font-semibold hover:bg-soft lg:flex" aria-label={`Nivel ${r.level.n}, ${r.level.name}, ${r.points} puntos`}>
      <Trophy size={16} style={{ color: r.level.color }} aria-hidden="true" />
      <span>Nv. {r.level.n}</span>
      <span className="font-normal text-muted">{r.points} pts</span>
    </Link>
  )
}

export function RewardsPanel() {
  const r = useRewards()
  const pct = Math.round(r.progress * 100)
  return (
    <section id="recompensas" className="card flex scroll-mt-24 flex-col gap-5 p-5" aria-labelledby="rw-title">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: r.level.color }}>
          <Trophy size={30} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Nivel {r.level.n} de {LEVELS.length}</p>
          <h2 id="rw-title" className="text-xl font-extrabold">{r.level.name}</h2>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-soft" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Avance al siguiente nivel">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: r.level.color }} />
          </div>
          <p className="mt-1.5 text-sm text-muted">
            <strong className="text-navy">{r.points} puntos</strong>
            {r.next ? <> · faltan {r.next.min - r.points} para <strong className="text-navy">{r.next.name}</strong></> : ' · nivel máximo alcanzado'}
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-base font-bold"><Award size={18} className="text-primary" aria-hidden="true" /> Insignias <span className="text-sm font-normal text-muted">({r.earnedIds.length}/{r.badges.length})</span></h3>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {r.badges.map((b) => (
            <li key={b.id} className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center ${b.earned ? 'border-[#A9D3F5] bg-soft' : 'border-line bg-bg'}`}>
              <span className={`text-3xl ${b.earned ? '' : 'opacity-35 grayscale'}`} aria-hidden="true">{b.emoji}</span>
              <span className="flex items-center gap-1 text-[13px] font-bold">{!b.earned && <Lock size={12} className="text-muted" aria-label="Bloqueada" />}{b.name}</span>
              <span className="text-xs leading-snug text-muted">{b.description}</span>
              {!b.earned && <span className="mt-1 text-[11px] font-semibold text-primary-strong">{b.current}/{b.goal}</span>}
            </li>
          ))}
        </ul>
      </div>

      <details className="rounded-xl bg-bg p-3 text-sm">
        <summary className="cursor-pointer font-semibold">¿Cómo gano puntos?</summary>
        <table className="mt-3 w-full text-left text-[13px]">
          <thead><tr className="text-muted"><th className="py-1 font-medium">Acción</th><th className="py-1 font-medium">Pts c/u</th><th className="py-1 font-medium">Veces</th><th className="py-1 text-right font-medium">Total</th></tr></thead>
          <tbody>
            {r.breakdown.map((b) => (
              <tr key={b.label} className="border-t border-line"><td className="py-1.5">{b.label}</td><td>{b.each}</td><td>{b.count}</td><td className="text-right font-semibold">{b.count * b.each}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="help mt-2">Niveles: {LEVELS.map((l) => `${l.name} (${l.min})`).join(' · ')}. Los puntos se recalculan a partir de tus aportes; no se pueden duplicar.</p>
      </details>
    </section>
  )
}
