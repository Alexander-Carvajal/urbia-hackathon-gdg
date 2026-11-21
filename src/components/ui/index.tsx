import { TriangleAlert as AlertIcon, Droplet, CloudRain, Clock, Eye, CircleCheck, Check, CircleX, X, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { CATEGORIES, STATUSES } from '../../data/categories'
import type { CategoryId, Status } from '../../types'

export const CATEGORY_ICON: Record<CategoryId, LucideIcon> = { bache: AlertIcon, agua: Droplet, inundacion: CloudRain }
const STATUS_ICON: Record<Status, LucideIcon> = { pendiente: Clock, revision: Eye, corroborado: Check, resuelto: CircleCheck, descartado: CircleX }

export function StatusBadge({ status, long = false }: { status: Status; long?: boolean }) {
  const s = STATUSES[status]
  const I = STATUS_ICON[status]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.fg, borderColor: s.border }}>
      <I size={13} aria-hidden="true" strokeWidth={2.4} />
      {long ? s.long : s.label}
    </span>
  )
}

export function CategoryTag({ category, size = 'sm' }: { category: CategoryId; size?: 'sm' | 'md' }) {
  const c = CATEGORIES[category]
  const I = CATEGORY_ICON[category]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'}`}
      style={{ background: c.tint, color: c.ink }}>
      <I size={size === 'md' ? 15 : 13} aria-hidden="true" strokeWidth={2.4} />
      {c.label}
    </span>
  )
}

export function CategoryDot({ category, size = 36 }: { category: CategoryId; size?: number }) {
  const c = CATEGORIES[category]
  const I = CATEGORY_ICON[category]
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-xl" style={{ width: size, height: size, background: c.tint }} aria-hidden="true">
      <I size={Math.round(size * 0.5)} color={c.ink} strokeWidth={2.2} />
    </span>
  )
}

export function Notice({ children, tone = 'info', className = '' }: { children: ReactNode; tone?: 'info' | 'warn'; className?: string }) {
  const I = tone === 'warn' ? TriangleAlert : Info
  return (
    <div role="note" className={`flex gap-2.5 rounded-xl px-3.5 py-3 text-[13px] leading-relaxed ${tone === 'warn' ? 'bg-[#FFF6EC] text-[#7A3E0E]' : 'bg-soft text-[#0A4F87]'} ${className}`}>
      <I size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

export function EmptyState({ icon: I, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-soft"><I size={26} className="text-primary" aria-hidden="true" /></span>
      <h2 className="text-lg font-bold">{title}</h2>
      {children && <p className="max-w-md text-sm text-muted">{children}</p>}
      {action}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-extrabold leading-tight md:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted md:text-[15px]">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

export function DemoTag({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#FFF6EC] px-2.5 py-1 text-xs font-semibold text-[#7A3E0E] ${className}`}>
      <Info size={12} aria-hidden="true" strokeWidth={2.6} /> Datos de demostración
    </span>
  )
}

/** Diálogo modal accesible: foco inicial, Escape para cerrar, retorno del foco. */
export function Modal({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const first = ref.current?.querySelector<HTMLElement>('input, textarea, select, button')
    first?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && ref.current) {
        const els = [...ref.current.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select')].filter((x) => !x.hasAttribute('disabled'))
        if (!els.length) return
        const a = els[0], b = els[els.length - 1]
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus() }
        else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); prev?.focus() }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="animate-fade fixed inset-0 z-[2000] flex items-end justify-center bg-[rgb(12_49_89/0.35)] p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="modal-title" className="animate-sheet max-h-[92vh] w-full overflow-auto rounded-t-2xl bg-white p-5 shadow-[var(--shadow-float)] sm:max-w-lg sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="modal-title" className="text-lg font-bold">{title}</h2>
          <button type="button" className="btn btn-ghost -mr-2 -mt-1 h-10 w-10 !min-h-0 !p-0" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>
        {children}
        {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
