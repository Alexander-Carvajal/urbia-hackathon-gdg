import { ArrowRight, CalendarDays, ChevronDown, ChevronRight, ChevronUp, CircleCheck, Clock, MapPin, ThumbsUp, Users, X } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES } from '../../data/categories'
import { zoneById } from '../../data/zones'
import { useCorroboration } from '../../features/reports/actions'
import { useReports } from '../../features/reports/store'
import { fullDate, plural, relativeTime } from '../../lib/format'
import { haversine } from '../../lib/geo'
import { confirmationsOf } from '../../lib/rules'
import type { Report } from '../../types'
import { CATEGORY_ICON, StatusBadge } from '../ui'

/** Imagen de cabecera: la foto del reporte o una ilustración de la categoría (la demo no trae fotos). */
export function ReportCover({ report, className = '', children }: { report: Report; className?: string; children?: ReactNode }) {
  const c = CATEGORIES[report.category]
  const I = CATEGORY_ICON[report.category]
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {report.photo
        ? <img src={report.photo} alt={`Evidencia del reporte: ${report.title}`} className="h-full w-full object-cover" />
        : (
          <div className="flex h-full w-full items-center justify-center" style={{ background: `radial-gradient(120% 90% at 20% 10%, #ffffff 0%, ${c.tint} 45%, ${c.color}33 100%)` }} role="img" aria-label={`Ilustración de ${c.label.toLowerCase()} (sin foto en esta demo)`}>
            <svg className="absolute inset-x-0 bottom-0 h-1/2 w-full opacity-40" viewBox="0 0 300 80" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 50c40-12 80-12 120 0s80 12 120 0 45-10 60-6v36H0z" fill={c.color} opacity=".25" />
              <path d="M0 64c40-10 80-10 120 0s80 10 120 0 45-8 60-4v20H0z" fill={c.color} opacity=".35" />
            </svg>
            <span className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white/80 shadow-[0_8px_24px_rgb(11_42_78/0.12)]">
              <I size={40} color={c.color} strokeWidth={2} aria-hidden="true" />
            </span>
          </div>
        )}
      {children}
    </div>
  )
}

function CategoryBadge({ report }: { report: Report }) {
  const c = CATEGORIES[report.category]
  const I = CATEGORY_ICON[report.category]
  return <span className="pill text-white shadow" style={{ background: c.color }}><I size={14} aria-hidden="true" strokeWidth={2.4} />{c.group}</span>
}

function Verification({ report }: { report: Report }) {
  const n = confirmationsOf(report)
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <p className="flex items-center gap-2 text-[15px] font-bold text-primary-strong"><Users size={18} aria-hidden="true" />Verificación comunitaria</p>
      {n > 0
        ? <p className="flex items-center gap-2 rounded-xl border border-[#BFE7CF] bg-[#F0FAF4] px-3 py-2.5 text-[14px] text-[#17663A]"><CircleCheck size={18} aria-hidden="true" /><span><strong>{n}</strong> {n === 1 ? 'ciudadano lo corroboró' : 'ciudadanos lo corroboraron'}</span></p>
        : <p className="rounded-xl border border-line bg-bg px-3 py-2.5 text-[14px] text-muted">Aún sin corroboraciones. ¿Lo has visto?</p>}
    </div>
  )
}

/** Tarjeta del reporte destacado en el inicio (escritorio). */
export function HomeReportCard({ report, onClose }: { report: Report; onClose: () => void }) {
  const zone = zoneById(report.zoneId)
  return (
    <aside aria-label="Reporte seleccionado" className="card animate-fade flex flex-col overflow-hidden">
      <ReportCover report={report} className="h-[190px]">
        <button type="button" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-navy/80 text-white hover:bg-navy" aria-label="Cerrar" onClick={onClose}><X size={18} /></button>
        <span className="absolute bottom-3 left-3"><CategoryBadge report={report} /></span>
      </ReportCover>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h2 className="text-[20px] font-extrabold leading-tight">{report.title}</h2>
        <div><StatusBadge status={report.status} /></div>
        <p className="line-clamp-4 text-[14px] leading-relaxed text-[#29435E]">{report.description}</p>
        <dl className="flex flex-col gap-1.5 text-[14px] text-[#29435E]">
          <div className="flex items-center gap-2"><CalendarDays size={16} className="shrink-0 text-primary" aria-hidden="true" /><dd>{fullDate(report.createdAt)} h</dd></div>
          <div className="flex items-center gap-2"><MapPin size={16} className="shrink-0 text-primary" aria-hidden="true" /><dd className="truncate">{report.reference ? report.reference.replace(/\s*\(ubicación ilustrativa\)/, '') : zone?.name}{zone ? `, ${zone.name}` : ''} (aprox.)</dd></div>
        </dl>
        <Verification report={report} />
        <Link to={`/reportes/${report.id}`} className="btn btn-primary mt-auto !min-h-12 w-full !text-[16px]">Ver detalle <ChevronRight size={18} aria-hidden="true" /></Link>
        <p className="text-center text-[11px] text-muted">Corroboración ciudadana · no equivale a una validación oficial</p>
      </div>
    </aside>
  )
}

function useRelated(report: Report) {
  const { reports } = useReports()
  return useMemo(() => reports
    .filter((x) => x.id !== report.id && x.status !== 'descartado')
    .map((x) => ({ r: x, d: haversine(report.lat, report.lng, x.lat, x.lng) }))
    .filter((x) => x.d <= 900)
    .sort((a, b) => a.d - b.d)
    .slice(0, 3), [reports, report])
}

function ConfirmButton({ report }: { report: Report }) {
  const c = useCorroboration(report)
  return (
    <>
      <button type="button" className="btn btn-outline w-full" onClick={c.run} disabled={c.disabled} title={c.reason || undefined}>
        {c.done ? <><CircleCheck size={18} aria-hidden="true" />Ya confirmaste esta incidencia</> : <><ThumbsUp size={18} aria-hidden="true" />Confirmar esta incidencia</>}
      </button>
      {c.reason && !c.done && <p className="-mt-1 text-center text-xs text-muted">{c.reason}</p>}
    </>
  )
}

/** Panel «Reporte seleccionado» del mapa de incidencias (escritorio ≥1024 px). */
export function SidePanel({ report, onClose }: { report: Report; onClose: () => void }) {
  const zone = zoneById(report.zoneId)
  const related = useRelated(report)
  return (
    <aside aria-label="Reporte seleccionado" className="card animate-fade hidden w-[340px] shrink-0 flex-col gap-3 self-stretch overflow-y-auto p-4 lg:flex">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-extrabold">Reporte seleccionado</h2>
        <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg text-navy hover:bg-soft" aria-label="Cerrar panel del reporte" onClick={onClose}><X size={20} /></button>
      </div>
      <ReportCover report={report} className="h-[150px] rounded-xl"><span className="absolute bottom-2.5 left-2.5"><CategoryBadge report={report} /></span></ReportCover>
      <h3 className="text-[18px] font-extrabold leading-snug">{report.title}</h3>
      <div><StatusBadge status={report.status} long /></div>
      <dl className="flex flex-col gap-1.5 text-[14px] text-[#29435E]">
        <div className="flex items-center gap-2"><MapPin size={16} className="shrink-0 text-muted" aria-hidden="true" /><dd>{zone?.name}{zone ? ` – ${zone.hint}` : ''}</dd></div>
        <div className="flex items-center gap-2"><Clock size={16} className="shrink-0 text-muted" aria-hidden="true" /><dd>{relativeTime(report.createdAt).replace(/^./, (m) => m.toUpperCase())}</dd></div>
        <div className="flex items-center gap-2"><Users size={16} className="shrink-0 text-muted" aria-hidden="true" /><dd>{plural(confirmationsOf(report), 'confirmación ciudadana', 'confirmaciones ciudadanas')}</dd></div>
      </dl>
      {related.length > 0 && (
        <div className="border-t border-line pt-3">
          <p className="mb-1.5 text-[14px] font-bold">Reportes relacionados</p>
          <ul className="flex flex-col gap-1 text-[13px]">
            {related.map(({ r, d }) => (
              <li key={r.id}><Link to={`/mapa?sel=${r.id}`} className="flex gap-2 hover:text-primary-strong"><span aria-hidden="true">•</span><span className="flex-1">{r.title}</span><span className="shrink-0 text-muted">{d < 1000 ? `${Math.round(d / 10) * 10} m` : ''}</span></Link></li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-auto flex flex-col gap-2 pt-1">
        <ConfirmButton report={report} />
        <Link to={`/reportes/${report.id}`} className="btn btn-primary w-full">Ver detalle completo <ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
    </aside>
  )
}

/** Bottom sheet (móvil) o drawer flotante (768–1023 px). Se monta dentro del mapa. */
export function FloatingPanel({ report, onClose }: { report: Report; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const startY = useRef<number | null>(null)
  const zone = zoneById(report.zoneId)
  return (
    <div className="lg:hidden">
      <section aria-label="Reporte seleccionado"
        className="animate-sheet fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-[1260] flex max-h-[72vh] flex-col gap-3 overflow-y-auto rounded-t-3xl border border-line bg-white px-5 pb-5 pt-2 shadow-[var(--shadow-float)] md:absolute md:inset-x-auto md:bottom-auto md:right-16 md:top-3 md:w-[330px] md:max-h-[calc(100%-24px)] md:rounded-2xl md:pt-4"
        onTouchStart={(e) => { startY.current = e.touches[0].clientY }}
        onTouchEnd={(e) => {
          if (startY.current == null) return
          const dy = e.changedTouches[0].clientY - startY.current
          if (dy < -40) setExpanded(true)
          else if (dy > 60) { if (expanded) setExpanded(false); else onClose() }
          startY.current = null
        }}>
        <span className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-[#C9DDEC] md:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between gap-2">
          <CategoryBadge report={report} />
          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-soft" aria-label="Cerrar panel del reporte" onClick={onClose}><X size={18} /></button>
        </div>
        {expanded && <ReportCover report={report} className="h-[140px] rounded-xl" />}
        <h2 className="text-[18px] font-extrabold leading-snug">{report.title}</h2>
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted"><StatusBadge status={report.status} /><span>{zone?.name} · {plural(confirmationsOf(report), 'confirmación', 'confirmaciones')}</span></div>
        {expanded && <p className="text-sm leading-relaxed text-[#29435E]">{report.description}</p>}
        <button type="button" className="btn btn-ghost !min-h-9 self-start !px-2 text-[13px]" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
          {expanded ? <>Ver menos <ChevronDown size={15} /></> : <>Ver más <ChevronUp size={15} /></>}
        </button>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ConfirmButton report={report} />
          <Link to={`/reportes/${report.id}`} className="btn btn-primary">Ver detalle <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  )
}
