import { ZONES } from '../data/zones'
import type { Zone } from '../types'

const R = 6371000

/** Distancia en metros entre dos coordenadas (fórmula de Haversine). */
export function haversine(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function nearestZone(lat: number, lng: number): Zone {
  let best = ZONES[0]
  let bd = Infinity
  for (const z of ZONES) {
    const d = haversine(lat, lng, z.lat, z.lng)
    if (d < bd) { bd = d; best = z }
  }
  return best
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`
}

/** Normaliza texto para búsquedas locales (sin acentos, minúsculas). */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Límites aproximados del área de Cancún para validar puntos del formulario. */
export const inCancunArea = (lat: number, lng: number) => lat > 20.95 && lat < 21.3 && lng > -87.05 && lng < -86.7
