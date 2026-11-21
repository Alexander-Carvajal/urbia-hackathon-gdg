import { ArrowRight, CircleCheck, Droplets, ExternalLink, Info, Map as MapIcon, MapPin, Megaphone, Network } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CategoryChips, type CategoryFilter } from '../../components/map/CategoryChips'
import { ReportDensityLayer, TemperatureLayer, useTemperature, type TempMode } from '../../components/map/HeatLayers'
import { HeatLegend, MapLayersMenu, type HeatLayer } from '../../components/map/HeatLegend'
import { FloatingPanel, HomeReportCard } from '../../components/map/SelectionPanel'
import { UrbiaMap } from '../../components/map/UrbiaMap'
import { CategoryDot, StatusBadge } from '../../components/ui'
import { CATEGORIES } from '../../data/categories'
import { AVISO_SOURCES, AVISO_TYPES, avisoDate } from '../../features/avisos/api'
import { AvisosLayer, useAvisos, useMappableAvisos } from '../../features/avisos/AvisosProvider'
import { WeatherCard, WeatherPill } from '../../features/avisos/Weather'
import { detectConnections } from '../../features/connections/detect'
import { useReports } from '../../features/reports/store'
import { plural, relativeTime } from '../../lib/format'
import { confirmationsOf, isActive } from '../../lib/rules'
import { SearchBox } from '../Layout'

function Kpi({ icon: I, tone, value, label, hint }: { icon: typeof Megaphone; tone: 'orange' | 'green' | 'blue'; value: number; label: string; hint: string }) {
  const t = { orange: ['#FEF0E4', '#F07A1E'], green: ['#E8F7EE', '#1E9E5A'], blue: ['#E6F2FD', '#1A82E8'] }[tone]
  return (
    <div className="card flex items-center gap-4 px-5 py-4">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: t[0] }}><I size={26} color={t[1]} strokeWidth={2} aria-hidden="true" /></span>
      <div className="min-w-0">
        <p className="text-[14px] font-medium">{label}</p>
        <p className="font-display text-[30px] font-extrabold leading-tight">{value}</p>
        <p className="truncate text-[13px] text-muted">{hint}</p>
      </div>
    </div>
  )
}

function DemoPill({ children }: { children: ReactNode }) {
  return <span className="pill border border-line bg-white text-[#33506C]"><Info size={13} aria-hidden="true" />{children}</span>
}

export function HomePage() {
  const { reports } = useReports()
  const [cat, setCat] = useState<CategoryFilter>('todos')
  const [sel, setSel] = useState<string | null>(null)
  const [cardOpen, setCardOpen] = useState(true)
  const [heat, setHeat] = useState<HeatLayer>('densidad')
  const [tempMode, setTempMode] = useState<TempMode>('temp')
  const [showAvisos, setShowAvisos] = useState(true)
  const temp = useTemperature(heat === 'temperatura')

  const active = useMemo(() => reports.filter(isActive), [reports])
  const visible = useMemo(() => (cat === 'todos' ? active : active.filter((r) => r.category === cat)), [active, cat])
  const kpi = {
    active: active.length,
    unconfirmed: active.filter((r) => confirmationsOf(r) === 0).length,
    corroborated: reports.filter((r) => r.status === 'corroborado').length,
    zones: new Set(active.map((r) => r.zoneId)).size,
  }
  // Reporte destacado: el activo con más confirmaciones (se muestra aunque no se haya tocado un pin)
  const featured = useMemo(() => [...active].sort((a, b) => confirmationsOf(b) - confirmationsOf(a))[0], [active])
  const selected = sel ? reports.find((r) => r.id === sel) : undefined
  const card = selected ?? (cardOpen ? featured : undefined)
  const nearby = useMemo(() => [...active].sort((a, b) => (b.status === 'corroborado' ? 1 : 0) - (a.status === 'corroborado' ? 1 : 0) || confirmationsOf(b) - confirmationsOf(a)).slice(0, 4), [active])

  const connection = useMemo(() => detectConnections(reports)[0], [reports])
  const { avisos } = useAvisos()
  const mapAvisos = useMappableAvisos(14)
  const latest = (avisos.data ?? []).filter((a) => a.city !== 'otra').slice(0, 3)

  const select = (id: string | null) => { setSel(id); if (id) setCardOpen(true) }
  const closeCard = () => { setSel(null); setCardOpen(false) }

  return (
    <div className="flex flex-col gap-5 px-4 pt-4 md:px-8 md:pt-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Columna principal */}
        <div className="flex min-w-0 flex-col gap-4 md:gap-5">
          <div className="flex flex-col gap-2">
            <div className="hidden md:block"><DemoPill>Datos de demostración</DemoPill></div>
            <h1 className="text-[26px] font-extrabold leading-tight md:text-[34px]"><span className="md:hidden">Tu ciudad, cerca de ti</span><span className="hidden md:inline">Tu ciudad, en una sola vista</span></h1>
            <p className="text-[15px] text-muted md:text-[16px]"><span className="md:hidden">Explora incidencias y participa en tu comunidad.</span><span className="hidden md:inline">Descubre lo que sucede cerca de ti y ayuda a mejorar Cancún.</span></p>
          </div>

          {/* Móvil: clima + búsqueda */}
          <div className="flex flex-col gap-3 md:hidden">
            <WeatherPill />
            <SearchBox id="home-search" placeholder="Buscar región, colonia o reporte…" />
          </div>
          {/* Tablet: clima arriba (en escritorio va en la columna derecha) */}
          <div className="hidden md:block lg:hidden"><WeatherCard /></div>

          <div className="hidden gap-4 md:grid md:grid-cols-3">
            <Kpi icon={Megaphone} tone="orange" value={kpi.active} label="Reportes activos" hint={`${kpi.unconfirmed} aún sin corroboraciones`} />
            <Kpi icon={CircleCheck} tone="green" value={kpi.corroborated} label="Corroborados" hint="por otros ciudadanos" />
            <Kpi icon={MapPin} tone="blue" value={kpi.zones} label="Zonas con incidencias" hint="zonas con reportes activos" />
          </div>

          <UrbiaMap
            className="card map-home h-[400px] !rounded-[22px] md:h-[clamp(460px,calc(100vh-420px),620px)]"
            reports={visible} selectedId={card?.id ?? null} onSelect={select} cluster={false} legend="none"
            showAvisosLegend={showAvisos}
            layers={<MapLayersMenu heat={heat} onHeat={setHeat} tempMode={tempMode} onTempMode={setTempMode} avisos={showAvisos} onAvisos={setShowAvisos} avisosCount={mapAvisos.length} />}
            extraLayer={<>
              {heat === 'densidad' && <ReportDensityLayer reports={visible} opacity={0.6} />}
              {heat === 'temperatura' && temp.data && <TemperatureLayer data={temp.data} mode={tempMode} />}
              {showAvisos && <AvisosLayer avisos={mapAvisos} />}
            </>}
            topLeft={<>
              <CategoryChips className="hidden md:flex" value={cat} onChange={setCat} reports={active} />
              <span className="pill bg-white text-[13px] text-navy shadow md:hidden"><MapIcon size={14} aria-hidden="true" />{cat === 'todos' ? '3 categorías activas' : CATEGORIES[cat].short}</span>
            </>}
            overlay={<>
              {heat === 'temperatura' && <HeatLegend layer={heat} temp={temp} tempMode={tempMode} count={visible.length} />}
              <span className="pointer-events-none absolute bottom-2 left-3 z-[600] hidden rounded-lg bg-white/85 px-2 py-1 text-[11px] text-muted md:block">Ubicaciones aproximadas</span>
              <Link to="/mapa" className="absolute bottom-4 left-1/2 z-[600] hidden -translate-x-1/2 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[14px] font-semibold text-primary-strong shadow-[0_2px_12px_rgb(11_42_78/0.18)] hover:bg-soft md:flex"><MapIcon size={17} aria-hidden="true" />Abrir mapa urbano</Link>
              {selected && <FloatingPanel report={selected} onClose={() => setSel(null)} />}
            </>}
          />
          <CategoryChips className="-mx-4 px-4 md:hidden" value={cat} onChange={setCat} reports={active} />
        </div>

        {/* Columna derecha (escritorio): clima + reporte */}
        <div className="hidden flex-col gap-5 lg:flex">
          <WeatherCard />
          {card && <HomeReportCard report={card} onClose={closeCard} />}
        </div>
      </div>

      {/* Móvil: reportes cerca de ti */}
      <section className="card flex flex-col gap-3 p-4 md:hidden" aria-labelledby="near-title">
        <div className="flex items-center justify-between">
          <h2 id="near-title" className="text-[17px] font-extrabold">Reportes cerca de ti</h2>
          <Link to="/reportes" className="flex items-center gap-1 text-[14px] font-semibold text-primary-strong">Ver todos <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
        <p className="-mt-2 text-[12px] text-muted">Información comunitaria · datos de ejemplo</p>
        <ul className="flex flex-col gap-2">
          {nearby.map((r) => (
            <li key={r.id}>
              <Link to={`/reportes/${r.id}`} className="flex items-center gap-3 rounded-xl border border-line p-3 hover:bg-bg">
                <CategoryDot category={r.category} size={42} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold">{r.title}</span>
                  <span className="flex items-center gap-1.5 text-[12px] text-muted"><StatusBadge status={r.status} /> {plural(confirmationsOf(r), 'confirmación', 'confirmaciones')}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Avisos y conexiones */}
      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="card flex flex-col gap-3 p-5" aria-labelledby="av-home">
          <div className="flex items-center gap-2">
            <Droplets size={19} className="text-primary" aria-hidden="true" />
            <h2 id="av-home" className="text-[16px] font-bold">Últimos avisos oficiales</h2>
            <Link to="/avisos" className="btn btn-ghost ml-auto !min-h-9 !px-2 text-sm">Ver todos <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          {avisos.status === 'loading' && !avisos.data && <p className="help">Consultando avisos oficiales…</p>}
          {avisos.status === 'error' && !avisos.data && <p className="help">No se pudieron cargar los avisos en este momento.</p>}
          <ul className="flex flex-col gap-2">
            {latest.map((a) => (
              <li key={a.key}>
                <a href={a.link} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 rounded-xl border border-line p-3 hover:bg-bg">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: AVISO_TYPES[a.type].color }} aria-hidden="true" />
                  <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold leading-snug">{a.title}</span><span className="text-xs text-muted">{AVISO_SOURCES[a.source].short} · {AVISO_TYPES[a.type].label} · {relativeTime(avisoDate(a.date))}</span></span>
                  <ExternalLink size={14} className="mt-1 shrink-0 text-muted" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
        {connection && (
          <section aria-labelledby="cx-home" className="card flex flex-col gap-3 p-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted"><Network size={14} aria-hidden="true" /> Conexiones urbanas · {connection.zoneName}</p>
            <div className="flex items-center gap-2">{connection.categories.map((c) => <CategoryDot key={c} category={c} size={40} />)}</div>
            <h2 id="cx-home" className="text-[16px] font-bold">{connection.title}</h2>
            <p className="text-[13px] text-muted">{connection.reports.length} reportes a menos de 500 m en 7 días · <em className="not-italic font-medium text-[#7A3E0E]">Coincidencia observada; no implica causalidad.</em></p>
            <Link to={`/analisis?cx=${connection.id}`} className="btn btn-secondary mt-auto self-start">Explorar relación <ArrowRight size={16} aria-hidden="true" /></Link>
          </section>
        )}
      </div>
    </div>
  )
}
