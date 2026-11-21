import { icon } from 'leaflet'
import symbol from './encharcamiento.svg'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Marker, Popup, useMap } from 'react-leaflet'
import points from '../../data/encharcamientos.json'

export const waterloggingPoints = points

const markerIcon = icon({ iconUrl: symbol, iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12], className: 'waterlogging-point' })
export function WaterloggingSymbol() {
  return <img src={symbol} width={20} height={20} alt="" className="inline-block shrink-0 align-middle" />
}

export function WaterloggingLayer({ focusId, locations = points }: { focusId?: string | null; locations?: typeof points }) {
  const map = useMap()
  useEffect(() => {
    const point = points.find((p) => String(p.id) === focusId)
    if (point) map.setView([point.lat, point.lng], 16)
    else if (focusId === 'todos') map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [32, 32] })
  }, [focusId, map])

  return <>{locations.map((point) => (
    <Marker key={point.id} position={[point.lat, point.lng]} icon={markerIcon} title={point.address}
      zIndexOffset={String(point.id) === focusId ? 500 : -50} alt={`Encharcamiento: ${point.address}`}>
      <Popup><strong>Punto de encharcamiento {point.id}</strong><p>{point.address}</p>
        <small>Inventario de referencia · sin fecha de observación</small></Popup>
    </Marker>
  ))}</>
}

export function WaterloggingDirectory() {
  const [id, setId] = useState('todos')
  return (
    <section className="card flex flex-col gap-3 p-4" aria-labelledby="waterlogging-heading">
      <h2 id="waterlogging-heading" className="font-display text-lg font-bold">Puntos de encharcamiento</h2>
      <p className="text-sm text-muted">El inventario contiene {points.length} ubicaciones de Cancún. El archivo no indica cuándo se observó agua en cada punto.</p>
      <label htmlFor="waterlogging-address" className="label">Consultar una dirección</label>
      <select id="waterlogging-address" className="input min-w-0" value={id} onChange={(event) => setId(event.target.value)}>
        <option value="todos">Todos los puntos</option>
        {points.map((point) => <option key={point.id} value={point.id}>{point.id} · {point.address}</option>)}
      </select>
      <Link className="btn btn-outline" to={`/mapa?encharcamiento=${id}`}>{id === 'todos' ? 'Ver inventario en el mapa' : 'Ver esta dirección en el mapa'}</Link>
      <p className="help">Fuente: Puntos de Encharcamientos.csv</p>
    </section>
  )
}
