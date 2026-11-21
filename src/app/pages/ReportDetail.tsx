import { ArrowLeft, Camera, Clock, FileQuestion, MapPin, ShieldCheck, Users, Flag, Info } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MiniMap } from '../../components/map/UrbiaMap'
import { CategoryDot, CategoryTag, EmptyState, Notice, StatusBadge } from '../../components/ui'
import { CATEGORIES, RULES, STATUSES } from '../../data/categories'
import { zoneById } from '../../data/zones'
import { detectConnections } from '../../features/connections/detect'
import { CorroborateButton, ObjectionButton } from '../../features/reports/actions'
import { useReports } from '../../features/reports/store'
import { fullDate, relativeTime, plural } from '../../lib/format'
import { formatDistance, haversine } from '../../lib/geo'
import { confirmationsOf, evidenceOf, isExpired, lastObservation, reportStatus, RULE_TEXT } from '../../lib/rules'

export function ReportDetail() {
  const { id = '' } = useParams()
  const { reports, getReport, user } = useReports()
  const r = getReport(id)

  const related = useMemo(() => {
    if (!r) return []
    const cx = detectConnections(reports).find((c) => c.reports.some((x) => x.id === r.id))
    const fromCx = cx ? cx.reports.filter((x) => x.id !== r.id) : []
    const near = reports.filter((x) => x.id !== r.id && !fromCx.includes(x) && haversine(r.lat, r.lng, x.lat, x.lng) <= 800)
    return [...fromCx, ...near].slice(0, 4).map((x) => ({ r: x, d: haversine(r.lat, r.lng, x.lat, x.lng), inCx: fromCx.includes(x) }))
  }, [r, reports])

  if (!r) {
    return (
      <div className="px-4 py-8 md:px-8">
        <div className="card"><EmptyState icon={FileQuestion} title="No encontramos este reporte" action={<Link to="/reportes" className="btn btn-primary">Ver todos los reportes</Link>}>El identificador «{id}» no existe en los datos de este navegador. Si restableciste la demo, los reportes creados se borraron.</EmptyState></div>
      </div>
    )
  }

  const zone = zoneById(r.zoneId)
  const conf = confirmationsOf(r)
  const ev = evidenceOf(r)
  const progress = Math.min(100, (conf / RULES.corroboradoAt) * 100)

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-8 md:py-7">
      <Link to="/reportes" className="btn btn-ghost -ml-2 self-start !min-h-9 !px-2 text-sm"><ArrowLeft size={16} aria-hidden="true" /> Volver a reportes</Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article className="card flex flex-col gap-4 p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryTag category={r.category} size="md" />
            <StatusBadge status={reportStatus(r)} long />
            <span className="text-xs text-muted">ID {r.id}</span>
          </div>
          <h1 className="text-[24px] font-extrabold leading-tight md:text-[28px]">{r.title}</h1>
          <dl className="grid gap-2 text-sm text-[#3D5873] sm:grid-cols-2">
            <div className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /><div><dt className="sr-only">Ubicación</dt><dd><strong className="text-navy">{zone?.name}</strong> · {r.reference || 'Sin referencia'} · punto aproximado (±{r.accuracyM} m)</dd></div></div>
            <div className="flex gap-2"><Clock size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /><div><dt className="sr-only">Fecha</dt><dd>{fullDate(r.createdAt)} ({relativeTime(r.createdAt)})</dd></div></div>
            <div className="flex gap-2"><Users size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /><div><dt className="sr-only">Fuente</dt><dd>Fuente: Ciudadanía · demo · por {r.authorId === user.id ? 'ti' : r.authorAlias}</dd></div></div>
            <div className="flex gap-2"><Camera size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /><div><dt className="sr-only">Evidencia</dt><dd>{plural(ev, 'evidencia', 'evidencias')}{r.isDemoSeed && ev > 0 ? ' (fotos no incluidas en la demo)' : ''}</dd></div></div>
          </dl>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {r.photo
              ? <img src={r.photo} alt={`Evidencia fotográfica: ${r.title}`} className="h-56 w-full rounded-xl object-cover" />
              : <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-xl bg-bg text-center text-sm text-muted"><Camera size={26} aria-hidden="true" />{ev > 0 ? 'Las fotos de los datos demo no se incluyen' : 'Sin fotografía'}</div>}
            <MiniMap report={r} className="h-56" />
          </div>

          <section aria-labelledby="desc-h">
            <h2 id="desc-h" className="mb-1.5 text-base font-bold">Descripción</h2>
            <p className="text-[15px] leading-relaxed text-[#29435E]">{r.description}</p>
          </section>

          {isExpired(r) && <Notice tone="warn">Sin actualización. Este reporte salió de las vistas activas. Última observación: {fullDate(lastObservation(r))}.</Notice>}
          {reportStatus(r) === 'resuelto' && r.status !== 'resuelto' && <Notice>Dos vecinos indicaron que la incidencia ya no está o fue atendida.</Notice>}
          {r.statusReason && <Notice tone={r.status === 'descartado' ? 'warn' : 'info'}><strong>{STATUSES[r.status].long}:</strong> {r.statusReason}</Notice>}

          <section aria-labelledby="hist-h">
            <h2 id="hist-h" className="mb-3 text-base font-bold">Historial de cambios</h2>
            <ol className="relative flex flex-col gap-4 border-l-2 border-line pl-5">
              {[...r.history].reverse().map((h, i) => (
                <li key={i} className="relative">
                  <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white ${h.status ? 'bg-primary' : 'bg-[#B7CCDD]'}`} aria-hidden="true" />
                  <p className="text-sm font-semibold">{h.text}</p>
                  <p className="text-xs text-muted">{fullDate(h.at)} · {h.by}{h.status ? ` · ${STATUSES[h.status].long}` : ''}</p>
                </li>
              ))}
            </ol>
          </section>
        </article>

        <div className="flex flex-col gap-4">
          <section aria-labelledby="corr-h" className="card flex flex-col gap-3.5 p-5">
            <h2 id="corr-h" className="flex items-center gap-2 text-base font-bold"><ShieldCheck size={18} className="text-primary" aria-hidden="true" /> Corroboración comunitaria</h2>
            <div className="flex items-end gap-2"><span className="font-display text-[34px] font-extrabold leading-none">{conf}</span><span className="pb-1 text-sm text-muted">{conf === 1 ? 'vecino lo observó' : 'vecinos lo observaron'}</span></div>
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-soft" role="progressbar" aria-valuemin={0} aria-valuemax={RULES.corroboradoAt} aria-valuenow={Math.min(conf, RULES.corroboradoAt)} aria-label="Avance hacia la regla de corroboración">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted">{Math.min(conf, RULES.corroboradoAt)} de {RULES.corroboradoAt} confirmaciones · {plural(ev, 'evidencia', 'evidencias')} (mínimo {RULES.minEvidence})</p>
            </div>
            <p className="rounded-xl bg-bg p-3 text-xs leading-relaxed text-[#3D5873]">{RULE_TEXT}</p>
            <CorroborateButton report={r} full />
            <ObjectionButton report={r} />
            {r.objections.length > 0 && <p className="flex items-center gap-1.5 text-xs text-muted"><Flag size={13} aria-hidden="true" />{plural(r.objections.length, 'objeción registrada', 'objeciones registradas')} para revisión</p>}
            <Notice>Esta validación es comunitaria. <strong>Corroborado por la comunidad no equivale a validación oficial.</strong></Notice>
          </section>

          <section aria-labelledby="rel-h" className="card flex flex-col gap-3 p-5">
            <h2 id="rel-h" className="text-base font-bold">Reportes relacionados</h2>
            {related.length === 0 ? <p className="help">No hay otros reportes a menos de 800 m.</p> : (
              <ul className="flex flex-col gap-2">
                {related.map(({ r: x, d, inCx }) => (
                  <li key={x.id}>
                    <Link to={`/reportes/${x.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-bg">
                      <CategoryDot category={x.category} size={34} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{x.title}</span><span className="text-xs text-muted">{formatDistance(d)} · {CATEGORIES[x.category].short} · {relativeTime(x.createdAt)}</span></span>
                      {inCx && <span className="rounded-full bg-soft px-2 py-0.5 text-[11px] font-semibold text-primary-strong">Conexión</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link to={`/mapa?sel=${r.id}`} className="btn btn-secondary">Ver en el mapa</Link>
          </section>

          <p className="flex items-start gap-2 px-1 text-xs text-muted"><Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />La canalización a autoridades no está integrada en este prototipo.</p>
        </div>
      </div>
    </div>
  )
}
