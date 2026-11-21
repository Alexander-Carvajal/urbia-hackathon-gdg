import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Bell, Check, LocateFixed, MapPin, Route, Search, Star, X } from 'lucide-react'
import type { Polyline as LeafletPolyline } from 'leaflet'
import { Circle, CircleMarker, Marker, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { routeOriginIcon, userIcon } from '../../components/map/pins'
import { UrbiaMap } from '../../components/map/UrbiaMap'
import { WaterloggingLayer, waterloggingPoints } from '../../components/map/WaterloggingLayer'
import { CATEGORIES, CATEGORY_IDS } from '../../data/categories'
import { useReports } from '../../features/reports/store'
import { formatDistance, haversine, inCancunArea, norm } from '../../lib/geo'
import { relativeTime } from '../../lib/format'
import { confirmationsOf, isActive, reportStatus } from '../../lib/rules'
import { searchPlaces } from '../../lib/search'

type Point = { lat: number; lng: number }
type Place = Point & { label: string; accuracy?: number }
type StreetRoute = { points: Point[]; distance: number; duration: number }
const CORRIDOR = 250
const FAVORITES_KEY = 'urbia:destinos-frecuentes'

function loadFavorites(): Place[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]')
    return Array.isArray(data) ? data.filter(p => typeof p?.label === 'string' && inCancunArea(p.lat, p.lng)) : []
  } catch { return [] }
}

function positionOnRoute(point: Point, points: Point[]) {
  let distance = Infinity, along = 0, traveled = 0
  const scale = Math.cos(point.lat * Math.PI / 180)
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i]
    const x = (b.lng - a.lng) * scale, y = b.lat - a.lat
    const length = x * x + y * y
    const t = length ? Math.max(0, Math.min(1, (((point.lng - a.lng) * scale) * x + (point.lat - a.lat) * y) / length)) : 0
    const segment = haversine(a.lat, a.lng, b.lat, b.lng)
    const offset = haversine(point.lat, point.lng, a.lat + t * y, a.lng + t * (b.lng - a.lng))
    if (offset < distance) { distance = offset; along = traveled + t * segment }
    traveled += segment
  }
  return { distance, along }
}

function AnimatedRoute({ route }: { route: StreetRoute }) {
  const line = useRef<LeafletPolyline>(null)
  const positions = useMemo(() => route.points.map((p): [number, number] => [p.lat, p.lng]), [route])
  useEffect(() => {
    const element = line.current?.getElement()
    if (!element || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    element.setAttribute('pathLength', '1')
    const animation = element.animate([
      { strokeDasharray: '1 1', strokeDashoffset: '1' },
      { strokeDasharray: '1 1', strokeDashoffset: '0' },
    ], { duration: 650, easing: 'ease-out' })
    return () => animation.cancel()
  }, [route])
  return <>
    <Polyline positions={positions} pathOptions={{ color: 'white', weight: 9, opacity: .85, interactive: false }} />
    <Polyline ref={line} positions={positions} pathOptions={{ color: '#075bb9', weight: 5, interactive: false, className: 'route-trace' }} />
  </>
}

function RouteOverlay({ route, origin, destination, focus, onPick }: {
  route: StreetRoute | null; origin: Place | null; destination: Place | null; focus: Point | null; onPick: (point: Point) => void
}) {
  const map = useMap()
  useMapEvents({ click: e => onPick(e.latlng) })
  useEffect(() => {
    const points = route?.points ?? [origin, destination].filter(p => p !== null)
    if (points.length) map.fitBounds(points.map(p => [p.lat, p.lng]), { padding: [28, 28], maxZoom: route ? 16 : 15, animate: !matchMedia('(prefers-reduced-motion: reduce)').matches })
  }, [map, route, origin, destination])
  useEffect(() => {
    if (!focus) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) map.setView([focus.lat, focus.lng], 17, { animate: false })
    else map.flyTo([focus.lat, focus.lng], 17, { duration: .45 })
  }, [map, focus])
  return <>
    {route && <AnimatedRoute route={route} />}
    {origin?.accuracy !== undefined && <Circle center={[origin.lat, origin.lng]} radius={Math.min(origin.accuracy, 500)}
      pathOptions={{ color: '#B42318', weight: 1, fillOpacity: .08, interactive: false }} />}
    {origin && <Marker position={[origin.lat, origin.lng]} icon={origin.accuracy === undefined ? routeOriginIcon : userIcon}
      zIndexOffset={900} alt={origin.accuracy === undefined ? 'Origen del trayecto' : 'Tu ubicación'}>
      <Tooltip permanent direction="top" offset={[0, -14]}>{origin.accuracy === undefined ? 'Origen' : 'Tu ubicación'}</Tooltip>
    </Marker>}
    {destination && <CircleMarker center={[destination.lat, destination.lng]} radius={8} pathOptions={{ color: 'white', weight: 2, fillColor: '#006c76', fillOpacity: 1 }}>
      <Tooltip direction="top" offset={[0, -7]}>Destino</Tooltip>
    </CircleMarker>}
  </>
}

function nameDistance(a: string, b: string) {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + Number(a[i - 1] !== b[j - 1]))
    }
    previous = row
  }
  return previous[b.length]
}

function PlaceField({ label, value, change, choose, chosen }: { label: string; value: string; change: (v: string) => void; choose: (p: Place) => void; chosen: boolean }) {
  const id = label === 'Origen' ? 'route-origin' : 'route-destination'
  const { reports } = useReports()
  const matches = !chosen && value.trim().length >= 2 ? searchPlaces(value, reports) : null
  const local: Place[] = matches ? [
    ...(matches.zone ? [{ ...matches.zone, label: matches.zone.name }] : []),
    ...matches.points.map(p => ({ ...p, label: p.address })),
    ...matches.reports.map(r => ({ ...r, label: r.title })),
  ].slice(0, 6) : []
  const [result, setResult] = useState<{ query: string; places: Place[]; message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => pending.current?.abort(), [])
  const active = result?.query === value ? result : null
  const places = [...(active?.places ?? []), ...local].slice(0, 8)
  function cancelSearch() {
    pending.current?.abort()
    pending.current = null
    setLoading(false)
    setResult(null)
  }

  const lookup = useCallback(async () => {
    if (chosen || value.trim().length < 2 || loading) return
    if (active && !active.message) return
    const controller = new AbortController()
    pending.current = controller
    setLoading(true)
    setResult(null)
    const timeout = setTimeout(() => controller.abort(), 9000)
    try {
      const params = new URLSearchParams({ q: value.trim(), bbox: '-87.05,20.95,-86.7,21.3', lat: '21.145', lon: '-86.825', limit: '6' })
      const endpoint = import.meta.env.VITE_PLACE_SEARCH_ENDPOINT || 'https://photon.komoot.io/api/'
      const response = await fetch(endpoint + '?' + params, { signal: controller.signal })
      if (!response.ok) throw new Error()
      const data = await response.json() as { features: {
        geometry: { coordinates: [number, number] }
        properties: { name?: string; street?: string; housenumber?: string; district?: string; city?: string }
      }[] }
      const found: (Place & { score: number })[] = []
      const query = norm(value)
      for (const { geometry, properties } of data.features) {
        const [lng, lat] = geometry.coordinates
        const name = properties.name || [properties.street, properties.housenumber].filter(Boolean).join(' ')
        if (!name || !inCancunArea(lat, lng)) continue
        const label = [name, properties.district || properties.city].filter(Boolean).join(' · ')
        if (!found.some(place => place.label === label)) found.push({ lat, lng, label, score: nameDistance(query, norm(name)) })
      }
      if (pending.current === controller) setResult({ query: value, places: found.sort((a, b) => a.score - b.score), message: '' })
    } catch {
      if (pending.current === controller) setResult({ query: value, places: [], message: 'El buscador en línea no respondió. Intenta otra vez o marca el punto en el mapa.' })
    } finally {
      clearTimeout(timeout)
      if (pending.current === controller) setLoading(false)
    }
  }, [active, chosen, loading, value])

  useEffect(() => {
    if (chosen || !focused || value.trim().length < 3 || local.length || active || loading) return
    const timer = setTimeout(() => void lookup(), 800)
    return () => clearTimeout(timer)
  }, [active, chosen, focused, loading, local.length, lookup, value])

  return <div className="relative" onFocus={() => setFocused(true)}
    onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false) }}>
    <label className="label block" htmlFor={id}>{label}</label>
    <div className="flex gap-2">
      <input id={id} className="input min-w-0" value={value} maxLength={120} onChange={e => { setFocused(true); cancelSearch(); change(e.target.value) }}
        onKeyDown={e => {
          if (e.key === 'Escape' && !chosen) { setFocused(false); return }
          if (e.key !== 'Enter' || chosen) return
          e.preventDefault()
          if (places.length === 1) { cancelSearch(); choose(places[0]) }
          else void lookup()
        }} placeholder="Región, calle o lugar" autoComplete="off" />
      <button type="button" className="btn btn-secondary !px-3" aria-label={'Buscar ' + label.toLowerCase() + ' en Cancún'}
        disabled={chosen || value.trim().length < 2 || loading} onClick={() => void lookup()}>{chosen ? <Check size={18} className="text-ok" /> : <Search size={18} />}</button>
    </div>
    {!chosen && focused && matches && <div aria-live="polite" className="absolute inset-x-0 top-full z-30 mt-1 rounded-xl border border-line bg-white shadow-[var(--shadow-float)]">
      {loading && <p className="px-3 py-2 text-sm text-muted">Buscando lugares en Cancún…</p>}
      {active?.message && <p className="px-3 py-2 text-sm text-danger">{active.message}</p>}
      {places.length > 0 && <ul className="max-h-56 divide-y divide-line overflow-y-auto">{places.map((place, i) => <li key={i}>
        <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-soft" onClick={() => { cancelSearch(); choose(place) }}>{place.label}</button>
      </li>)}</ul>}
      {matches && !places.length && !loading && !active?.message && <p className="px-3 py-2 text-sm text-muted">
        {active ? 'Sin resultados en Cancún. Puedes marcar el punto en el mapa.' : 'Buscando sugerencias…'}
      </p>}
    </div>}
  </div>
}

export function RoutePage() {
  const { reports, freshnessTick } = useReports()
  const [origin, setOrigin] = useState<Place | null>(null), [destination, setDestination] = useState<Place | null>(null)
  const [originText, setOriginText] = useState(''), [destinationText, setDestinationText] = useState('')
  const [picking, setPicking] = useState<'origin' | 'destination' | null>(null)
  const [routes, setRoutes] = useState<StreetRoute[]>([])
  const [routeIndex, setRouteIndex] = useState(0)
  const route = routes[routeIndex]
  const [focus, setFocus] = useState<Point | null>(null)
  const [favorites, setFavorites] = useState(loadFavorites)
  const [favoriteError, setFavoriteError] = useState('')
  const mapRegion = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false), [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [alert, setAlert] = useState<{ text: string; reportId: string } | null>(null)
  const [permission, setPermission] = useState(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  const request = useRef<AbortController | null>(null)
  const lastRequest = useRef(0)
  const alerted = useRef<Set<string>>(new Set())
  const [alertStart, setAlertStart] = useState(0)
  useEffect(() => () => request.current?.abort(), [])

  const clearRoute = useCallback(() => {
    request.current?.abort()
    request.current = null
    setBusy(false)
    setRoutes([])
    setRouteIndex(0)
    setFocus(null)
    setAlert(null)
    setError('')
    setSelected(null)
  }, [])
  function pick(point: Point) {
    if (!picking) return
    const place = { ...point, label: 'Punto marcado en el mapa' }
    clearRoute()
    if (picking === 'origin') { setOrigin(place); setOriginText('') }
    else { setDestination(place); setDestinationText('') }
    setPicking(null)
  }
  const locationRequest = useRef(0)
  const locate = useCallback(() => {
    if (!navigator.geolocation) { setError('La ubicación no está disponible. Marca el origen en el mapa.'); return }
    const attempt = ++locationRequest.current
    setLocating(true)
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (attempt !== locationRequest.current) return
      setLocating(false)
      if (!inCancunArea(coords.latitude, coords.longitude)) {
        setError('La ubicación del dispositivo está fuera del área de Cancún. Busca o marca un origen manualmente.')
        return
      }
      clearRoute()
      setPicking(null)
      setOrigin({ lat: coords.latitude, lng: coords.longitude, label: 'Mi ubicación', accuracy: coords.accuracy })
      setOriginText('')
    }, () => {
      if (attempt !== locationRequest.current) return
      setLocating(false)
      setError('No se pudo obtener tu ubicación. Puedes marcar el origen en el mapa.')
    }, { timeout: 10000 })
  }, [clearRoute])

  useEffect(() => {
    let mounted = true
    const attempt = locationRequest.current
    void navigator.permissions?.query({ name: 'geolocation' }).then(permission => {
      if (mounted && locationRequest.current === attempt && permission.state === 'granted') locate()
    }).catch(() => {})
    return () => { mounted = false; locationRequest.current++ }
  }, [locate])
  async function calculate(event: FormEvent) {
    event.preventDefault()
    if (!origin || !destination || busy || Date.now() - lastRequest.current < 1000) return
    clearRoute()
    if (![origin, destination].every(p => inCancunArea(p.lat, p.lng))) { setError('Selecciona un origen y un destino dentro del área de Cancún.'); return }
    if (haversine(origin.lat, origin.lng, destination.lat, destination.lng) < 10) { setError('Elige un destino distinto del origen.'); return }
    const controller = new AbortController()
    request.current = controller
    lastRequest.current = Date.now()
    setBusy(true)
    const timeout = setTimeout(() => controller.abort(), 12000)
    try {
      const coordinates = [origin, destination].map(p => [p.lng.toFixed(5), p.lat.toFixed(5)].join(',')).join(';')
      const endpoint = (import.meta.env.VITE_ROUTE_ENDPOINT || 'https://routing.openstreetmap.de/routed-car/route/v1/driving').replace(/\/$/, '')
      const result = await fetch(endpoint + '/' + coordinates + '?overview=full&geometries=geojson&generate_hints=false&alternatives=2', { signal: controller.signal })
      if (!result.ok) throw new Error()
      const data = await result.json() as { code: string; routes?: { distance: number; duration: number; geometry?: { coordinates: [number, number][] } }[] }
      const candidates = (data.routes ?? []).flatMap(item => {
        const coordinates = item.geometry?.coordinates
        if (!Array.isArray(coordinates) || coordinates.length < 2 || !Number.isFinite(item.distance) || !Number.isFinite(item.duration)) return []
        return [{ points: coordinates.map(([lng, lat]) => ({ lat, lng })), duration: item.duration, distance: item.distance }]
      })
      if (data.code !== 'Ok' || !candidates.length) throw new Error()
      if (request.current !== controller || controller.signal.aborted) return
      setRoutes(candidates)
      setAlertStart(Date.now())
      alerted.current.clear()
    } catch {
      if (request.current === controller) setError('No se pudo calcular la ruta por calles. Revisa tu conexión o vuelve a intentarlo.')
    } finally {
      clearTimeout(timeout)
      if (request.current === controller) setBusy(false)
    }
  }

  const comparisons = useMemo(() => routes.map(option => ({
    nearby: reports.filter(isActive).map(report => ({ report, ...positionOnRoute(report, option.points) }))
      .filter(item => item.distance <= CORRIDOR).sort((a, b) => a.along - b.along),
    inventory: waterloggingPoints.map(point => ({ point, ...positionOnRoute(point, option.points) }))
      .filter(item => item.distance <= CORRIDOR).sort((a, b) => a.along - b.along),
  })), [routes, reports, freshnessTick])
  const nearby = comparisons[routeIndex]?.nearby ?? []
  const inventory = comparisons[routeIndex]?.inventory ?? []
  const updates = nearby.filter(({ report }) => !report.isDemoSeed && Date.parse(report.createdAt) >= alertStart)
  const selectedReport = nearby.find(({ report }) => report.id === selected)?.report

  function showOnMap(point: Point, reportId: string | null = null) {
    setSelected(reportId)
    setFocus({ lat: point.lat, lng: point.lng })
    mapRegion.current?.scrollIntoView({ block: 'center' })
  }

  function updateFavorites(items: Place[]) {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(items))
      setFavorites(items)
      setFavoriteError('')
    } catch { setFavoriteError('El navegador no pudo guardar el destino.') }
  }

  useEffect(() => {
    if (!route) return
    for (const category of CATEGORY_IDS) {
      if (alerted.current.has(category)) continue
      const recent = reports.filter(r => {
        const time = Date.parse(r.createdAt)
        return r.category === category && r.source === 'ciudadania' && !r.isDemoSeed && isActive(r)
          && time >= Math.max(alertStart, Date.now() - 3600000) && time <= Date.now()
          && positionOnRoute(r, route.points).distance <= CORRIDOR
      })
      if (recent.length < 3 || new Set(recent.map(r => r.authorId)).size < 2) continue
      alerted.current.add(category)
      const message = recent.length + ' reportes nuevos de ' + CATEGORIES[category].short.toLowerCase() + ' cerca de tu trayecto.'
      setAlert({ text: message, reportId: recent[0].id })
      if (permission !== 'granted') continue
      void (async () => {
        try {
          const worker = await navigator.serviceWorker?.getRegistration()
          if (worker?.active) await worker.showNotification('URBIA · Alerta de trayecto', { body: message, tag: 'urbia-route-' + category, data: { routeAlert: true } })
          else {
            const notification = new Notification('URBIA · Alerta de trayecto', { body: message, tag: 'urbia-route-' + category, data: { routeAlert: true } })
            notification.onclick = () => { window.focus(); notification.close() }
          }
        } catch { /* La alerta sigue visible en el trayecto. */ }
      })()
    }
  }, [route, reports, alertStart, permission])

  return <div className="map-dashboard">
    <div><h1 className="font-display text-3xl font-extrabold">Planear trayecto</h1>
      <p className="px-3 py-2 text-sm text-muted">Consulta un trayecto en auto por Cancún y revisa qué reportes quedan cerca.</p></div>
    <form onSubmit={calculate} className="card grid items-start gap-4 p-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <PlaceField label="Origen" value={origin?.label ?? originText} change={v => { locationRequest.current++; setLocating(false); clearRoute(); setOrigin(null); setOriginText(v) }} choose={p => { locationRequest.current++; setLocating(false); clearRoute(); setOrigin(p); setPicking(null) }} chosen={!!origin} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline route-origin-action" onClick={locate} disabled={locating}><LocateFixed size={16} />{locating ? 'Ubicando…' : 'Mi ubicación'}</button>
          <button type="button" className="btn btn-secondary route-origin-action" aria-pressed={picking === 'origin'} onClick={() => { locationRequest.current++; setLocating(false); setPicking('origin') }}><MapPin size={16} />Marcar origen</button>
        </div>
      </div>
      <div className="grid gap-2">
        <PlaceField label="Destino" value={destination?.label ?? destinationText} change={v => { clearRoute(); setDestination(null); setDestinationText(v) }} choose={p => { clearRoute(); setDestination(p); setPicking(null) }} chosen={!!destination} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" aria-pressed={picking === 'destination'} onClick={() => setPicking('destination')}><MapPin size={16} />Marcar destino</button>
          {destination && !favorites.some(p => p.lat === destination.lat && p.lng === destination.lng) && <button type="button" className="btn btn-outline" onClick={() => {
            if (favorites.length >= 8) { setFavoriteError('Puedes guardar hasta ocho destinos. Elimina uno para añadir otro.'); return }
            updateFavorites([...favorites, destination])
          }}><Star size={16} />Guardar destino</button>}
        </div>
        {favoriteError && <p role="alert" className="text-sm text-danger">{favoriteError}</p>}
        {favorites.length > 0 && <div>
          <p className="mb-1 text-xs font-semibold text-muted">Destinos frecuentes</p>
          <ul className="flex flex-wrap gap-2">{favorites.map(place => <li key={place.lat + ',' + place.lng} className="flex max-w-full items-center rounded-xl border border-line bg-bg">
            <button type="button" className="min-w-0 truncate py-2 pl-3 text-sm font-semibold text-primary-strong" onClick={() => {
              clearRoute()
              setDestination(place)
              setPicking(null)
              if (!origin) locate()
            }}>{place.label}</button>
            <button type="button" className="grid h-10 w-10 shrink-0 place-items-center" aria-label={'Quitar destino guardado: ' + place.label} onClick={() => updateFavorites(favorites.filter(item => item !== place))}><X size={15} /></button>
          </li>)}</ul>
        </div>}
      </div>
      {picking && <p className="text-sm text-primary-strong sm:col-span-2" role="status">Toca el mapa para marcar el {picking === 'origin' ? 'origen' : 'destino'}.</p>}
      <button className="btn btn-primary justify-self-start" disabled={!origin || !destination || busy || locating}><Route size={18} />{busy ? 'Calculando…' : 'Calcular ruta'}</button>
      <p className="help self-center">{!origin || !destination ? 'Selecciona un origen y un destino para calcular la ruta.' : 'Listo para calcular el recorrido en auto.'} <span className="block">Datos de OpenStreetMap · Photon y OSRM</span></p>
      {error && <p className="text-sm text-danger sm:col-span-2" role="alert">{error}</p>}
    </form>
    {routes.length > 1 && <section aria-label="Comparar recorridos" className="card p-4">
      <h2 className="mb-2 text-lg font-bold">Comparar recorridos</h2>
      <div className="grid gap-2 sm:grid-cols-3">{routes.map((option, index) => <button key={index} type="button"
        aria-pressed={index === routeIndex} className="rounded-xl border border-line p-3 text-left aria-pressed:border-primary aria-pressed:bg-soft"
        onClick={() => { setRouteIndex(index); setFocus(null); setSelected(null); setAlert(null) }}>
        <strong className="block">{index === 0 ? 'Ruta principal' : 'Alternativa ' + index}</strong>
        <span className="block text-sm">{formatDistance(option.distance)} · {Math.max(1, Math.round(option.duration / 60))} min</span>
        <span className="block text-sm text-muted">{comparisons[index].nearby.length} reportes · {comparisons[index].inventory.length} puntos de referencia</span>
      </button>)}</div>
    </section>}
    {updates.length > 0 && <div className="card flex flex-wrap items-center justify-between gap-2 bg-soft p-3">
      <p role="status">{alert?.text ?? 'Hay reportes nuevos cerca del trayecto.'}</p>
      <button type="button" className="btn btn-outline" onClick={() => {
        const report = (updates.find(item => item.report.id === alert?.reportId) ?? updates[0]).report
        showOnMap(report, report.id)
      }}>Ver en el mapa</button>
    </div>}
    <div ref={mapRegion} className="grid gap-2">
      <UrbiaMap className="card h-[clamp(330px,55dvh,600px)]" reports={nearby.map(item => item.report)} selectedId={selected} onSelect={setSelected}
        cluster={false} legend="none" showLocationControl={false} extraLayer={<><RouteOverlay route={route ?? null} origin={origin} destination={destination} focus={focus} onPick={pick} />
        {inventory.length > 0 && <WaterloggingLayer locations={inventory.map(item => item.point)} />}</>} />
      {selectedReport && <article key={selectedReport.id} aria-label="Reporte del trayecto" className="card route-report-preview flex flex-wrap items-center gap-3 p-3">
        {selectedReport.photo && <img className="h-16 w-24 rounded-lg object-cover" src={selectedReport.photo} alt="Foto del reporte" />}
        <div className="min-w-0 flex-1">
          <strong>{selectedReport.title}</strong>
          <p className="text-sm text-muted">{relativeTime(selectedReport.createdAt)} · {confirmationsOf(selectedReport)} confirmaciones</p>
        </div>
        <Link to={'/reportes/' + selectedReport.id} className="btn btn-outline">Ver reporte</Link>
        <button type="button" className="grid h-10 w-10 place-items-center" aria-label="Cerrar ficha del reporte" onClick={() => setSelected(null)}><X size={18} /></button>
      </article>}
    </div>
    {route && <section className="card grid gap-3 p-4" aria-label="Consideraciones del trayecto">
      <h2 className="text-lg font-bold">{formatDistance(route.distance)} · {Math.max(1, Math.round(route.duration / 60))} min estimados</h2>
      <p className="text-sm text-muted">{nearby.length} reportes activos y {inventory.length} puntos de referencia a hasta {CORRIDOR} m del trayecto.</p>
      {nearby.length > 0 && <ul className="divide-y divide-line rounded-xl border border-line">{nearby.map(({ report, along }) => <li key={report.id}>
        <button type="button" className="w-full p-3 text-left hover:bg-soft" onClick={() => showOnMap(report, report.id)}>
          <strong className="block">{report.title}</strong>
          <span className="block text-sm text-muted">{formatDistance(along)} desde el inicio · {reportStatus(report) === 'corroborado' ? 'Corroborado por vecinos' : 'Reporte activo'} · {relativeTime(report.createdAt)}{report.isDemoSeed ? ' · Demo' : ''}</span>
        </button>
      </li>)}</ul>}
      {inventory.length > 0 && <details className="rounded-xl border border-line p-3">
        <summary className="cursor-pointer font-semibold">Inventario de encharcamientos · {inventory.length} puntos</summary>
        <p className="help mt-2">Ubicaciones de referencia sin fecha de observación.</p>
        <ul className="mt-2 divide-y divide-line">{inventory.map(({ point, along }) => <li key={point.id}>
          <button type="button" className="w-full rounded-lg p-2 text-left text-sm hover:bg-soft" onClick={() => showOnMap(point)}>
            <strong>{formatDistance(along)}</strong> · {point.address}
          </button>
        </li>)}</ul>
      </details>}
      <button type="button" className="btn btn-outline justify-self-start" disabled={permission !== 'default'} onClick={async () => {
        try { setPermission(await Notification.requestPermission()) } catch { setPermission('unsupported') }
      }}><Bell size={17} />{permission === 'granted' ? 'Alertas del dispositivo activas' : 'Activar alertas del dispositivo'}</button>
      <p className="help">Mantén este trayecto abierto para recibir alertas. Se avisa al detectar 3 reportes nuevos del mismo tipo publicados por al menos 2 personas en una hora.</p>
      {(permission === 'denied' || permission === 'unsupported') && <p className="help">El navegador no permite notificaciones del dispositivo. Las alertas aparecen en esta pantalla.</p>}
    </section>}
  </div>
}
