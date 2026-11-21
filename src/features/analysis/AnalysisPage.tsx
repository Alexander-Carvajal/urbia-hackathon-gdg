import { ArrowRight, BarChart3, CloudRain, Info, Leaf, MapPin, Network, Ruler, Timer, SearchX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CategoryDot, EmptyState, Notice, PageHeader, StatusBadge } from '../../components/ui'
import { CATEGORIES, CATEGORY_IDS, STATUSES, STATUS_ORDER } from '../../data/categories'
import { ZONES } from '../../data/zones'
import { detectConnections, type ConnectionParams } from '../connections/detect'
import { useReports } from '../reports/store'
import { relativeTime } from '../../lib/format'
import { formatDistance } from '../../lib/geo'
import { isActive } from '../../lib/rules'
import type { CategoryId } from '../../types'

const TABS = [
  { id: 'conexiones', label: 'Conexiones urbanas', icon: Network },
  { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
  { id: 'clima', label: 'Clima', icon: CloudRain },
  { id: 'ambiente', label: 'Ambiente y biodiversidad', icon: Leaf },
] as const
type TabId = (typeof TABS)[number]['id']

const PRI = { Alta: 'bg-[#FDECEC] text-[#9B1C1C]', Media: 'bg-[#FFF6EC] text-[#7A3E0E]', Baja: 'bg-soft text-[#0A4F87]' }

function Connections() {
  const { reports } = useReports()
  const [sp] = useSearchParams()
  const [params, setParams] = useState<ConnectionParams>({ radiusM: 500, windowDays: 7 })
  const [cat, setCat] = useState<'todos' | CategoryId>('todos')
  const [zone, setZone] = useState('todas')
  const focus = sp.get('cx')
  const all = useMemo(() => detectConnections(reports, params), [reports, params])
  const list = all.filter((c) => (cat === 'todos' || c.categories.includes(cat)) && (zone === 'todas' || c.zoneId === zone))

  useEffect(() => { if (focus) document.getElementById(focus)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, [focus])

  return (
    <div className="flex flex-col gap-4">
      <Notice tone="warn"><strong>Coincidencia no es causa.</strong> Estas asociaciones muestran reportes que ocurren cerca en espacio y tiempo. Sirven para orientar la atención, no demuestran que un fenómeno provoque otro.</Notice>

      <section aria-labelledby="crit-h" className="card grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <h2 id="crit-h" className="text-base font-bold">Criterios de detección</h2>
          <p className="help mt-1">Se agrupan reportes <strong>activos</strong> cuya distancia (Haversine) es menor al radio y cuya diferencia de fecha es menor a la ventana. Los grupos se encadenan: si A está cerca de B y B de C, forman una conexión.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold"><span className="inline-flex items-center gap-1.5"><Ruler size={15} aria-hidden="true" />Radio</span>
            <select className="input !w-auto" value={params.radiusM} onChange={(e) => setParams((p) => ({ ...p, radiusM: Number(e.target.value) }))}>
              {[250, 500, 1000].map((v) => <option key={v} value={v}>{v} m</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold"><span className="inline-flex items-center gap-1.5"><Timer size={15} aria-hidden="true" />Ventana</span>
            <select className="input !w-auto" value={params.windowDays} onChange={(e) => setParams((p) => ({ ...p, windowDays: Number(e.target.value) }))}>
              {[3, 7, 14].map((v) => <option key={v} value={v}>{v} días</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">Categoría
            <select className="input !w-auto" value={cat} onChange={(e) => setCat(e.target.value as 'todos' | CategoryId)}>
              <option value="todos">Todas</option>
              {CATEGORY_IDS.map((c) => <option key={c} value={c}>{CATEGORIES[c].short}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">Zona
            <select className="input !w-auto" value={zone} onChange={(e) => setZone(e.target.value)}>
              <option value="todas">Todas</option>
              {ZONES.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </label>
        </div>
      </section>

      <p className="text-sm text-muted" aria-live="polite">{list.length} conexión(es) detectada(s) con radio {params.radiusM} m y ventana de {params.windowDays} días.</p>

      {list.length === 0 ? <div className="card"><EmptyState icon={SearchX} title="Sin coincidencias con estos criterios">Prueba un radio mayor o una ventana de tiempo más amplia.</EmptyState></div> : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {list.map((c) => (
            <article key={c.id} id={c.id} className={`card flex scroll-mt-24 flex-col gap-4 p-5 ${focus === c.id ? 'ring-2 ring-primary' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">{c.categories.map((k, i) => <span key={k} className="flex items-center gap-2">{i > 0 && <span className="font-bold text-muted" aria-hidden="true">+</span>}<CategoryDot category={k} size={40} /></span>)}</div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${PRI[c.priority]}`}>Prioridad {c.priority.toLowerCase()}</span>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted"><MapPin size={13} aria-hidden="true" />{c.zoneName} · ubicación ilustrativa</p>
                <h3 className="mt-1 text-[17px] font-bold">{c.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#3D5873]">{c.summary}</p>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-bg p-2"><dt className="text-[11px] text-muted">Reportes</dt><dd className="font-display text-lg font-extrabold">{c.reports.length}</dd></div>
                <div className="rounded-xl bg-bg p-2"><dt className="text-[11px] text-muted">Separación máx.</dt><dd className="font-display text-lg font-extrabold">{formatDistance(c.maxDistanceM)}</dd></div>
                <div className="rounded-xl bg-bg p-2"><dt className="text-[11px] text-muted">En un lapso de</dt><dd className="font-display text-lg font-extrabold">{c.spanHours < 48 ? `${Math.round(c.spanHours)} h` : `${Math.round(c.spanHours / 24)} d`}</dd></div>
              </dl>
              <ul className="flex flex-col gap-1.5" aria-label="Reportes involucrados">
                {c.reports.map((r) => (
                  <li key={r.id}>
                    <Link to={`/reportes/${r.id}`} className="flex items-center gap-3 rounded-xl border border-line p-2.5 hover:bg-bg">
                      <CategoryDot category={r.category} size={30} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{r.title}</span><span className="text-xs text-muted">{relativeTime(r.createdAt)}</span></span>
                      <StatusBadge status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                <span className="text-xs font-medium text-[#7A3E0E]">Coincidencia observada; no implica causalidad.</span>
                <Link to={`/mapa?sel=${c.reports[0].id}`} className="btn btn-ghost !min-h-9 !px-2 text-sm">Ver en el mapa <ArrowRight size={15} aria-hidden="true" /></Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function Bars({ rows }: { rows: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(110px,40%)_1fr_32px] items-center gap-3 text-sm">
          <span className="truncate">{r.label}</span>
          <span className="h-3 overflow-hidden rounded-full bg-bg" aria-hidden="true"><span className="block h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} /></span>
          <span className="text-right font-bold">{r.value}</span>
        </li>
      ))}
    </ul>
  )
}

function Stats() {
  const { reports } = useReports()
  const active = reports.filter(isActive)
  const byZone = ZONES.map((z) => ({ label: z.name, value: reports.filter((r) => r.zoneId === z.id).length, color: '#24B7EE' })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value)
  return (
    <div className="flex flex-col gap-4">
      <Notice>Calculado en tiempo real a partir de los {reports.length} reportes de demostración guardados en este navegador ({active.length} activos). No son estadísticas oficiales.</Notice>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card p-5"><h2 className="mb-4 text-base font-bold">Por categoría</h2><Bars rows={CATEGORY_IDS.map((c) => ({ label: CATEGORIES[c].label, value: reports.filter((r) => r.category === c).length, color: CATEGORIES[c].color }))} /></section>
        <section className="card p-5"><h2 className="mb-4 text-base font-bold">Por estado</h2><Bars rows={STATUS_ORDER.map((s) => ({ label: STATUSES[s].long, value: reports.filter((r) => r.status === s).length, color: s === 'corroborado' ? '#087DD9' : s === 'resuelto' ? '#0C3159' : s === 'revision' ? '#24B7EE' : '#B7CCDD' }))} /></section>
        <section className="card p-5"><h2 className="mb-4 text-base font-bold">Por zona</h2><Bars rows={byZone} /></section>
      </div>
    </div>
  )
}

function Future({ icon: I, title, items, source }: { icon: typeof Leaf; title: string; items: string[]; source: string }) {
  return (
    <section className="card flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-soft"><I size={22} className="text-primary-strong" aria-hidden="true" /></span>
        <div><h2 className="text-lg font-bold">{title}</h2><span className="rounded-full bg-bg px-2 py-0.5 text-xs font-semibold text-muted">Próximamente · sin datos en el MVP</span></div></div>
      <ul className="grid gap-2 sm:grid-cols-2">{items.map((t) => <li key={t} className="flex gap-2 rounded-xl bg-bg p-3 text-sm"><Info size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />{t}</li>)}</ul>
      <p className="help">{source}</p>
    </section>
  )
}

export function AnalysisPage() {
  const [sp, setSp] = useSearchParams()
  const tab = (TABS.find((t) => t.id === sp.get('tab'))?.id ?? 'conexiones') as TabId
  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-8 md:py-7">
      <PageHeader title="Análisis" subtitle="Conexiones urbanas y vistas complementarias de la ciudad." />
      <div role="tablist" aria-label="Secciones de análisis" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:px-0">
        {TABS.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} id={`tab-${t.id}`}
            onClick={() => setSp({ tab: t.id })}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold ${tab === t.id ? 'bg-soft text-primary-strong' : 'text-[#33506C] hover:bg-white'}`}>
            <t.icon size={17} aria-hidden="true" />{t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'conexiones' && <Connections />}
        {tab === 'estadisticas' && <Stats />}
        {tab === 'clima' && <Future icon={CloudRain} title="Clima e inundaciones" source="Requeriría una fuente meteorológica externa (por ejemplo Open-Meteo o el Servicio Meteorológico Nacional), identificada con su nombre y hora de actualización. No mostramos cifras simuladas." items={['Lluvia acumulada por zona para anticipar encharcamientos', 'Cruce de lluvia con reportes de inundación (coincidencias, no causas)', 'Avisos oficiales enlazados a su fuente', 'Temperatura y sensación térmica por zona']} />}
        {tab === 'ambiente' && <Future icon={Leaf} title="Ambiente y biodiversidad" source="Extensiones futuras inspiradas en el prototipo anterior. Necesitarían fuentes verificadas (p. ej. NaturaLista para avistamientos, que ya oculta coordenadas de especies sensibles) y no se presentan como datos de autoridades." items={['Residuos cerca de cenotes urbanos', 'Avistamientos de fauna urbana con ubicación generalizada', 'Flora y cobertura vegetal por zona', 'Olores, humo y posibles vertidos']} />}
      </div>
    </div>
  )
}
