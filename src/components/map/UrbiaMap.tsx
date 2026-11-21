import L from 'leaflet'
import { ChevronDown, ChevronUp, LocateFixed, Minus, Plus, WifiOff, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Circle, MapContainer, Marker, ScaleControl, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { CATEGORIES, CATEGORY_IDS } from '../../data/categories'
import { CANCUN_CENTER, CANCUN_ZOOM } from '../../data/zones'
import { inCancunArea } from '../../lib/geo'
import type { Report } from '../../types'
import { useToast } from '../ui/Toast'
import { clusterIcon, draftPinIcon, pinIcon, pinSvg, userIcon } from './pins'

/** Mapa base Esri World Street Map (sin API key; rotula supermanzanas). Requiere atribución. */
export const TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
export const TILE_ATTRIBUTION = 'Mapa &copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

export interface FlyTarget { lat: number; lng: number; zoom: number; key: number }

/** Ajusta el tamaño del mapa cuando su contenedor cambia (panel contextual que se abre o cierra). */
function AutoResize() {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [map])
  return null
}

function FlyTo({ target }: { target?: FlyTarget | null }) {
  const map = useMap()
  useEffect(() => { if (target) map.flyTo([target.lat, target.lng], target.zoom, { duration: 0.8 }) }, [target, map])
  return null
}

function BackgroundClick({ onClick }: { onClick: () => void }) {
  useMapEvents({ click: onClick })
  return null
}

type TileState = 'loading' | 'ok' | 'error'

function useTileState() {
  const [state, setState] = useState<TileState>('loading')
  const [errors, setErrors] = useState(0)
  const handlers = useMemo(() => ({
    // Leaflet emite «load» aunque los mosaicos fallen; solo un mosaico cargado confirma el mapa base.
    tileload: () => setState('ok'),
    tileerror: () => setErrors((n) => n + 1),
  }), [])
  useEffect(() => { if (errors >= 4 && state !== 'ok') setState('error') }, [errors, state])
  useEffect(() => { const t = setTimeout(() => setState((s) => (s === 'loading' ? 'error' : s)), 12000); return () => clearTimeout(t) }, [])
  return { state, handlers }
}

function TileStatus({ state }: { state: TileState }) {
  if (state === 'ok') return null
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[500] flex -translate-y-1/2 justify-center px-4" role="status">
      <div className="pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl bg-white/95 px-4 py-3 text-sm shadow-[var(--shadow-float)]">
        {state === 'loading'
          ? <><Loader2 size={18} className="mt-0.5 animate-spin text-primary" aria-hidden="true" /><span>Cargando mapa base…</span></>
          : <><WifiOff size={18} className="mt-0.5 shrink-0 text-[#B45309]" aria-hidden="true" /><span><strong>No se pudo cargar el mapa base.</strong> Revisa tu conexión a internet. Los reportes siguen disponibles en el listado.</span></>}
      </div>
    </div>
  )
}

function MapButtons({ map, onLocated, layers }: { map: L.Map | null; onLocated: (p: { lat: number; lng: number; acc: number }) => void; layers?: ReactNode }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const locate = () => {
    if (!('geolocation' in navigator)) { toast('Tu navegador no permite geolocalización.', 'warn'); return }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false)
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy }
        onLocated(p)
        if (!inCancunArea(p.lat, p.lng)) toast('Tu ubicación está fuera del área de Cancún que cubre esta demostración.', 'info')
        map?.flyTo([p.lat, p.lng], 15)
      },
      (err) => { setBusy(false); toast(err.code === 1 ? 'Permiso de ubicación denegado. Puedes seguir usando el mapa sin él.' : 'No se pudo obtener tu ubicación.', 'warn') },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }
  return (
    <>
      <div className="absolute right-3 top-3 z-[600] flex flex-col gap-2.5">
        {layers}
        <button type="button" className="map-btn disabled:opacity-60" aria-label="Mostrar mi ubicación" onClick={locate} disabled={busy}>
          {busy ? <Loader2 size={19} className="animate-spin" /> : <LocateFixed size={19} />}
        </button>
      </div>
      <div className="absolute bottom-6 right-3 z-[600] flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_2px_10px_rgb(11_42_78/0.14)]">
        <button type="button" className="flex h-11 w-11 items-center justify-center text-navy hover:bg-soft" aria-label="Acercar" onClick={() => map?.zoomIn()}><Plus size={19} /></button>
        <span className="mx-2 h-px bg-line" aria-hidden="true" />
        <button type="button" className="flex h-11 w-11 items-center justify-center text-navy hover:bg-soft" aria-label="Alejar" onClick={() => map?.zoomOut()}><Minus size={19} /></button>
      </div>
    </>
  )
}

/** Leyenda siempre visible (estilo del diseño). */
export function LegendBox({ avisos = false, className = '' }: { avisos?: boolean; className?: string }) {
  return (
    <ul aria-label="Leyenda" className={`absolute bottom-12 left-3 z-[600] flex flex-col gap-1.5 rounded-xl bg-white/95 px-3 py-2.5 text-[13px] font-medium shadow-[0_2px_10px_rgb(11_42_78/0.14)] ${className}`}>
      {CATEGORY_IDS.map((c) => (
        <li key={c} className="flex items-center gap-2"><span className="-my-1" dangerouslySetInnerHTML={{ __html: pinSvg(c, 16) }} />{c === 'agua' ? 'Agua potable' : CATEGORIES[c].short}</li>
      ))}
      {avisos && <li className="flex items-center gap-2"><span className="mx-[3px] inline-block h-[11px] w-[11px] rotate-45 rounded-[3px] border-2 border-white bg-[#DC2626] shadow" aria-hidden="true" />Aviso oficial</li>}
    </ul>
  )
}

export function Legend({ className = '', avisos = false }: { className?: string; avisos?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`absolute bottom-12 left-3 z-[600] rounded-xl border border-line bg-white/95 shadow-[var(--shadow-soft)] ${className}`}>
      <button type="button" className="flex min-h-10 items-center gap-2 px-3 text-xs font-semibold" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        Leyenda {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
      {open && (
        <ul className="flex flex-col gap-2 px-3 pb-3 text-xs">
          {CATEGORY_IDS.map((c) => (
            <li key={c} className="flex items-center gap-2"><span dangerouslySetInnerHTML={{ __html: pinSvg(c, 18) }} />{CATEGORIES[c].label}</li>
          ))}
          <li className="flex items-center gap-2"><span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-sky bg-white text-[10px] font-bold">3</span>Grupo de reportes cercanos</li>
          {avisos && <li className="flex items-center gap-2"><span className="inline-block h-[14px] w-[14px] rotate-45 rounded-[4px] border-2 border-white bg-[#DC2626] shadow" aria-hidden="true" />Aviso oficial: Aguakan o Gobierno del Estado (ubicación inferida)</li>}
          <li className="text-muted">Puntos aproximados · datos de demostración</li>
        </ul>
      )}
    </div>
  )
}

interface Props {
  reports: Report[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  flyTo?: FlyTarget | null
  topLeft?: ReactNode
  overlay?: ReactNode
  className?: string
  cluster?: boolean
  /** Capas adicionales dentro del mapa (p. ej. avisos oficiales) */
  extraLayer?: ReactNode
  showAvisosLegend?: boolean
  /** toggle: leyenda plegable · box: siempre visible · none: sin leyenda */
  legend?: 'toggle' | 'box' | 'none'
  /** Botón/menú de capas que se muestra arriba a la derecha */
  layers?: ReactNode
  /** Se llama con los reportes dentro de la vista actual del mapa */
  onViewChange?: (visible: number) => void
}

/** Cuenta los reportes dentro de los límites visibles del mapa. */
function ViewWatcher({ reports, onChange }: { reports: Report[]; onChange: (n: number) => void }) {
  const map = useMap()
  useEffect(() => {
    const update = () => { const b = map.getBounds(); onChange(reports.filter((r) => b.contains([r.lat, r.lng])).length) }
    update()
    map.on('moveend', update)
    return () => { map.off('moveend', update) }
  }, [map, reports, onChange])
  return null
}

export function UrbiaMap({ reports, selectedId, onSelect, flyTo, topLeft, overlay, className = '', cluster = true, extraLayer, showAvisosLegend = false, legend = 'toggle', layers, onViewChange }: Props) {
  const [map, setMap] = useState<L.Map | null>(null)
  const [me, setMe] = useState<{ lat: number; lng: number; acc: number } | null>(null)
  const tiles = useTileState()

  const markers = reports.map((r) => (
    <Marker key={r.id} position={[r.lat, r.lng]} icon={pinIcon(r.category, r.id === selectedId)}
      title={`${CATEGORIES[r.category].label}: ${r.title}`} alt={`${CATEGORIES[r.category].label}: ${r.title}`}
      keyboard zIndexOffset={r.id === selectedId ? 1000 : 0}
      eventHandlers={{ click: () => onSelect(r.id), keypress: (e) => { if ((e.originalEvent as KeyboardEvent).key === 'Enter') onSelect(r.id) } }} />
  ))

  return (
    <div className={`relative isolate overflow-hidden ${className}`}>
      <MapContainer ref={setMap} center={CANCUN_CENTER} zoom={CANCUN_ZOOM} zoomControl={false} className="h-full w-full" attributionControl>
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} eventHandlers={tiles.handlers} />
        <AutoResize />
        <FlyTo target={flyTo} />
        <BackgroundClick onClick={() => onSelect(null)} />
        {cluster
          ? <MarkerClusterGroup chunkedLoading maxClusterRadius={36} disableClusteringAtZoom={14} iconCreateFunction={clusterIcon} showCoverageOnHover={false}>{markers}</MarkerClusterGroup>
          : markers}
        {extraLayer}
        <ScaleControl position="bottomleft" imperial={false} maxWidth={110} />
        {onViewChange && <ViewWatcher reports={reports} onChange={onViewChange} />}
        {me && <><Circle center={[me.lat, me.lng]} radius={Math.min(me.acc, 500)} pathOptions={{ color: '#1A82E8', weight: 1, fillOpacity: 0.08 }} /><Marker position={[me.lat, me.lng]} icon={userIcon} title="Tu ubicación aproximada" /></>}
      </MapContainer>
      {topLeft && <div className="pointer-events-none absolute left-3 right-16 top-3 z-[600]"><div className="pointer-events-auto">{topLeft}</div></div>}
      <MapButtons map={map} onLocated={setMe} layers={layers} />
      {legend === 'toggle' && <Legend avisos={showAvisosLegend} />}
      {legend === 'box' && <LegendBox avisos={showAvisosLegend} />}
      <TileStatus state={tiles.state} />
      {overlay}
    </div>
  )
}

function Picker({ onPick }: { onPick: (p: { lat: number; lng: number }) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

/** Mapa pequeño para elegir un punto (formulario). */
export function PickMap({ value, onChange, className = '' }: { value: { lat: number; lng: number } | null; onChange: (p: { lat: number; lng: number }) => void; className?: string }) {
  const tiles = useTileState()
  return (
    <div className={`relative isolate overflow-hidden rounded-xl border border-line ${className}`}>
      <MapContainer center={value ? [value.lat, value.lng] : CANCUN_CENTER} zoom={value ? 15 : 12} className="h-full w-full">
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} eventHandlers={tiles.handlers} />
        <AutoResize />
        <Picker onPick={onChange} />
        {value && <FlyTo target={{ lat: value.lat, lng: value.lng, zoom: 15, key: value.lat + value.lng }} />}
        {value && <Marker position={[value.lat, value.lng]} icon={draftPinIcon} draggable title="Punto del reporte (arrástralo para ajustar)"
          eventHandlers={{ dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onChange({ lat: ll.lat, lng: ll.lng }) } }} />}
      </MapContainer>
      <TileStatus state={tiles.state} />
    </div>
  )
}

/** Mapa estático del detalle: punto aproximado con círculo de precisión. */
export function MiniMap({ report, className = '' }: { report: Report; className?: string }) {
  const tiles = useTileState()
  return (
    <div className={`relative isolate overflow-hidden rounded-xl border border-line ${className}`}>
      <MapContainer center={[report.lat, report.lng]} zoom={15} className="h-full w-full" dragging={false} scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false} keyboard={false} zoomControl={false}>
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} eventHandlers={tiles.handlers} />
        <AutoResize />
        <Circle center={[report.lat, report.lng]} radius={report.accuracyM} pathOptions={{ color: CATEGORIES[report.category].color, weight: 1.5, fillOpacity: 0.12 }} />
        <Marker position={[report.lat, report.lng]} icon={pinIcon(report.category)} interactive={false} />
      </MapContainer>
      <TileStatus state={tiles.state} />
    </div>
  )
}
