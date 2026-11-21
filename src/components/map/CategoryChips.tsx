import { Check, Layers, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CATEGORIES, CATEGORY_IDS } from '../../data/categories'
import type { CategoryId, Report } from '../../types'
import { CATEGORY_ICON } from '../ui'

export type CategoryFilter = 'todos' | CategoryId

/** Selector de una categoría (inicio): Todos · Baches · Agua · Inundaciones. */
export function CategoryChips({ value, onChange, reports, className = '' }: { value: CategoryFilter; onChange: (v: CategoryFilter) => void; reports: Report[]; className?: string }) {
  const count = (c: CategoryFilter) => (c === 'todos' ? reports.length : reports.filter((r) => r.category === c).length)
  const opts: CategoryFilter[] = ['todos', ...CATEGORY_IDS]
  return (
    <div role="group" aria-label="Filtrar por categoría" className={`no-scrollbar flex gap-2 overflow-x-auto ${className}`}>
      {opts.map((o) => {
        const I = o === 'todos' ? null : CATEGORY_ICON[o]
        return (
          <button key={o} type="button" className="chip" aria-pressed={value === o} onClick={() => onChange(o)} aria-label={`${o === 'todos' ? 'Todos' : CATEGORIES[o].short}: ${count(o)} reportes`}>
            {I && <I size={17} color={CATEGORIES[o as CategoryId].color} strokeWidth={2.2} aria-hidden="true" />}
            {o === 'todos' ? 'Todos' : CATEGORIES[o].short}
          </button>
        )
      })}
    </div>
  )
}

/** «Capas visibles» (mapa de incidencias): varias categorías a la vez. */
export function LayerChips({ value, onChange, className = '' }: { value: CategoryId[]; onChange: (v: CategoryId[]) => void; className?: string }) {
  const toggle = (c: CategoryId) => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c])
  return (
    <div role="group" aria-label="Capas visibles" className={`no-scrollbar flex gap-2 overflow-x-auto ${className}`}>
      {CATEGORY_IDS.map((c) => {
        const on = value.includes(c)
        const meta = CATEGORIES[c]
        const I = CATEGORY_ICON[c]
        return (
          <button key={c} type="button" aria-pressed={on} onClick={() => toggle(c)}
            className="inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] px-4 text-[14px] font-semibold transition-colors"
            style={on ? { background: meta.tint, borderColor: meta.color + '88', color: meta.ink } : { background: '#fff', borderColor: '#E1EAF3', color: '#5D7590' }}>
            <I size={18} color={on ? meta.color : '#9AAABB'} strokeWidth={2.2} aria-hidden="true" />
            {c === 'agua' ? 'Falta de agua' : meta.short}
          </button>
        )
      })}
    </div>
  )
}

/** Botón con menú desplegable (capas del mapa, «Más filtros»). */
export function PopoverButton({ label, icon = 'layers', children, variant = 'map', align = 'right' }: { label: string; icon?: 'layers' | 'filters'; children: ReactNode; variant?: 'map' | 'chip'; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  const I = icon === 'layers' ? Layers : SlidersHorizontal
  return (
    <div className="relative" ref={ref}>
      {variant === 'map'
        ? <button type="button" className="map-btn" aria-label={label} aria-expanded={open} onClick={() => setOpen((v) => !v)}><I size={19} /></button>
        : <button type="button" className="chip" aria-expanded={open} onClick={() => setOpen((v) => !v)}><I size={17} aria-hidden="true" />{label}</button>}
      {open && (
        <div className={`animate-fade absolute top-12 z-[1400] w-[260px] rounded-2xl border border-line bg-white p-3 shadow-[var(--shadow-float)] ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {children}
        </div>
      )}
    </div>
  )
}

export function MenuOption({ checked, onClick, children, kind = 'radio' }: { checked: boolean; onClick: () => void; children: ReactNode; kind?: 'radio' | 'check' }) {
  return (
    <button type="button" role={kind === 'radio' ? 'menuitemradio' : 'menuitemcheckbox'} aria-checked={checked} onClick={onClick}
      className={`flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-[14px] ${checked ? 'bg-soft font-semibold text-primary-strong' : 'hover:bg-bg'}`}>
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 ${kind === 'radio' ? 'rounded-full' : 'rounded-md'} ${checked ? 'border-primary bg-primary text-white' : 'border-[#B9CCDD]'}`}>{checked && <Check size={12} strokeWidth={3.5} />}</span>
      {children}
    </button>
  )
}
