import { plural } from '../../lib/format'
import { useMap } from 'react-leaflet'
import { WaterloggingLayer, WaterloggingSymbol, waterloggingPoints } from '../../components/map/WaterloggingLayer'
import { Layers, Search, SearchX, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LayerChips, MenuOption, PopoverButton } from '../../components/map/CategoryChips'
import { ReportDensityLayer, TemperatureLayer, useTemperature, type TempMode } from '../../components/map/HeatLayers'
import { HeatLegend, MapLayersMenu, type HeatLayer } from '../../components/map/HeatLegend'
import { FloatingPanel, SidePanel } from '../../components/map/SelectionPanel'
import { UrbiaMap, type FlyTarget } from '../../components/map/UrbiaMap'
import { CATEGORY_IDS, STATUSES, STATUS_ORDER } from '../../data/categories'
import { AvisosLayer, useMappableAvisos } from '../../features/avisos/AvisosProvider'
import { WeatherStrip } from '../../features/avisos/Weather'
import { useReports } from '../../features/reports/store'
import { isActive, isExpired, reportStatus } from '../../lib/rules'
import { searchPlaces } from '../../lib/search'
import type { CategoryId, Status } from '../../types'

type StatusFilter = 'activos' | 'todos' | 'vencido' | Status

function SearchExtent({ locations }: { locations: { lat: number; lng: number }[] }) {
  const map = useMap()
  useEffect(() => {
    if (locations.length) map.fitBounds(locations.map(p => [p.lat, p.lng]), { padding: [40, 40], maxZoom: 16 })
  }, [locations, map])
  return null
}

export function MapPage() {
  const { reports, freshnessTick } = useReports()
  const [params, setParams] = useSearchParams()
  const [cats, setCats] = useState<CategoryId[]>(CATEGORY_IDS)
  const [status, setStatus] = useState<StatusFilter>('activos')
  const [q, setQ] = useState(params.get('q') ?? '')
  const [applied, setApplied] = useState(params.get('q') ?? '')
  const [fly, setFly] = useState<FlyTarget | null>(null)
  const [showAvisos, setShowAvisos] = useState(true)
  const [showWaterlogging, setShowWaterlogging] = useState(true)
  const focusPoint = params.get('encharcamiento')
  const [inView, setInView] = useState<number | null>(null)
  const avisos = useMappableAvisos(30)
  // La capa vive en la URL (?capa=densidad|temperatura) para poder compartir el enlace
  const capa = params.get('capa')
  const heat: HeatLayer = capa === 'densidad' || capa === 'temperatura' ? capa : 'ninguna'
  const setHeat = (l: HeatLayer) => setParams((p) => { const n = new URLSearchParams(p); if (l === 'ninguna') n.delete('capa'); else n.set('capa', l); return n }, { replace: true })
  const [tempMode, setTempMode] = useState<TempMode>('temp')
  const temp = useTemperature(heat === 'temperatura')
  const sel = params.get('sel')
  const setSel = (id: string | null) => setParams((p) => { const n = new URLSearchParams(p); if (id) n.set('sel', id); else n.delete('sel'); return n }, { replace: true })
  const onViewChange = useCallback((n: number) => setInView(n), [])

  // Búsqueda que llega desde el encabezado
  const urlQ = params.get('q') ?? ''
  useEffect(() => { setQ(urlQ); setApplied(urlQ) }, [urlQ])

  const byStatus = useMemo(() => reports.filter((r) =>
    status === 'todos' ? true : status === 'activos' ? isActive(r) : status === 'vencido' ? isExpired(r) : !isExpired(r) && reportStatus(r) === status), [reports, status, freshnessTick])
  const search = useMemo(() => searchPlaces(applied, byStatus), [applied, byStatus])
  const visible = useMemo(() => search.reports.filter(r => cats.includes(r.category)), [search, cats])
  const inventoryVisible = showWaterlogging && cats.includes('inundacion')
  const locations = useMemo(() => {
    if (!applied) return []
    const matches = [...visible, ...(inventoryVisible ? search.points : [])]
    return matches.length ? matches : search.zone ? [search.zone] : []
  }, [applied, visible, inventoryVisible, search])
  const noResults = locations.length === 0

  // Al llegar con ?sel= (o desde «Reportes relacionados») centramos el reporte
  useEffect(() => {
    const r = sel ? reports.find((x) => x.id === sel) : null
    if (r) setFly({ lat: r.lat, lng: r.lng, zoom: 15, key: Date.now() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel])

  const submit = (e: FormEvent) => { e.preventDefault(); setApplied(q.trim()); setParams((p) => { const n = new URLSearchParams(p); n.delete('sel'); n.delete('encharcamiento'); if (q.trim()) n.set('q', q.trim()); else n.delete('q'); return n }, { replace: true }) }
  const clear = () => { setQ(''); setApplied(''); setParams((p) => { const n = new URLSearchParams(p); n.delete('q'); return n }, { replace: true }) }
  const selected = sel ? reports.find((r) => r.id === sel) : undefined
  const filtersOn = status !== 'activos' || heat !== 'ninguna' || !showAvisos

  return (
    <div className="map-dashboard">
      <div>
        <h1 className="text-[26px] font-extrabold leading-tight md:text-[32px]">Mapa de incidencias</h1>
        <p className="mt-1 text-[15px] text-muted">Explora reportes cercanos y conoce qué está ocurriendo en Cancún.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <WeatherStrip />
        <form role="search" onSubmit={submit} className="relative self-center">
          <label htmlFor="map-search" className="sr-only">Buscar zona, colonia o referencia</label>
          <button type="submit" aria-label="Buscar en el mapa" className="absolute inset-y-0 left-0 grid w-11 place-items-center text-primary-strong"><Search size={18} /></button>
          <input id="map-search" value={q} onChange={(e) => setQ(e.target.value)} className="input !min-h-12 !pl-11 !pr-11" placeholder="Región, calle o nombre…" />
          {q && <button type="button" onClick={clear} className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg hover:bg-soft" aria-label="Limpiar búsqueda"><X size={16} /></button>}
        </form>
      </div>

      <div className="card flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="text-[15px] font-bold">Capas visibles</span><span className="text-xs text-muted">El pin gana intensidad con las confirmaciones.</span><Link className="btn btn-outline" to="/trayecto">Planear trayecto</Link>
        <LayerChips value={cats} onChange={setCats} className="-mx-1 px-1" />
        <span className="hidden h-8 w-px bg-line sm:block" aria-hidden="true" />
        <PopoverButton label="Más filtros" icon="filters" variant="chip" align="left">
          <label className="label mb-1 block px-1" htmlFor="status-filter">Estado</label>
          <select id="status-filter" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="input mb-3">
            <option value="activos">Activos</option>
            <option value="todos">Todos</option>
            <option value="vencido">Sin actualización</option>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUSES[s].long}</option>)}
          </select>
          <p className="mb-1 px-1 text-xs font-bold uppercase tracking-wide text-muted">Mapa de calor</p>
          <MenuOption checked={heat === 'ninguna'} onClick={() => setHeat('ninguna')}>Ninguno</MenuOption>
          <MenuOption checked={heat === 'densidad'} onClick={() => setHeat('densidad')}>Densidad de reportes</MenuOption>
          <MenuOption checked={heat === 'temperatura'} onClick={() => setHeat('temperatura')}>Temperatura</MenuOption>
          <p className="mb-1 mt-3 px-1 text-xs font-bold uppercase tracking-wide text-muted">Otras capas</p>
          <MenuOption kind="check" checked={showAvisos} onClick={() => setShowAvisos(!showAvisos)}>Avisos oficiales <span className="ml-auto text-xs text-muted">{avisos.length}</span></MenuOption>
        </PopoverButton>
        <button className="chip" aria-pressed={showWaterlogging && cats.includes('inundacion')} onClick={() => {
          if (!cats.includes('inundacion')) { setCats([...cats, 'inundacion']); setShowWaterlogging(true) }
          else setShowWaterlogging(!showWaterlogging)
        }}><WaterloggingSymbol />Inventario de encharcamientos · {waterloggingPoints.length}</button>
        {filtersOn && <span className="pill bg-soft text-primary-strong">Filtros activos</span>}
      </div>

      {applied && (
        <div role="status" className="flex flex-wrap items-center gap-2 text-sm">
          {noResults
            ? <span className="inline-flex items-center gap-2 rounded-xl bg-[#FFF6EC] px-3 py-2 text-[#7A3E0E]"><SearchX size={16} aria-hidden="true" />No se encontraron resultados para «{applied}».</span>
            : <span className="rounded-xl bg-soft px-3 py-2 text-[#0A4F87]">{plural(visible.length, 'reporte', 'reportes')} · {plural(inventoryVisible ? search.points.length : 0, 'punto de encharcamiento', 'puntos de encharcamiento')} para «{applied}»{search.zone && <span> · {search.zone.name}</span>}</span>}
          <button type="button" className="btn btn-ghost !min-h-9 !px-2 text-sm" onClick={clear}>Quitar búsqueda</button>
        </div>
      )}

      <div className={`dashboard-grid mb-4 ${selected ? 'has-detail' : ''}`}>
        <UrbiaMap
          className="card dashboard-canvas"
          reports={visible} selectedId={sel} onSelect={setSel} flyTo={fly} legend="box" onViewChange={onViewChange}
          showAvisosLegend={showAvisos}
          layers={<MapLayersMenu heat={heat} onHeat={setHeat} tempMode={tempMode} onTempMode={setTempMode} avisos={showAvisos} onAvisos={setShowAvisos} avisosCount={avisos.length} />}
          extraLayer={<>
            {heat === 'densidad' && <ReportDensityLayer reports={visible} />}
            {heat === 'temperatura' && temp.data && <TemperatureLayer data={temp.data} mode={tempMode} />}
            {inventoryVisible && <WaterloggingLayer locations={search.points} focusId={applied ? null : focusPoint} />}
            {applied && <SearchExtent locations={locations} />}
            {showAvisos && <AvisosLayer avisos={avisos} />}
          </>}
          topLeft={<span className="pill bg-white !px-3 !py-2 text-[14px] text-navy shadow-[0_2px_10px_rgb(11_42_78/0.14)]" aria-live="polite"><Layers size={16} aria-hidden="true" />{inView ?? visible.length} incidencias en esta vista</span>}
          overlay={<><HeatLegend layer={heat} temp={temp} tempMode={tempMode} count={visible.length} />{selected && <FloatingPanel report={selected} onClose={() => setSel(null)} />}</>}
        />
        {selected && <SidePanel report={selected} onClose={() => setSel(null)} />}
      </div>
    </div>
  )
}
