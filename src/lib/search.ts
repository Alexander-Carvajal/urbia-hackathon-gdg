import { ZONES, zoneById } from '../data/zones'
import type { Report, Zone } from '../types'
import { norm } from './geo'

export interface SearchResult { zone: Zone | null; reports: Report[] }

/** Búsqueda local por zona, referencia o título. Sin servicios externos. */
export function searchPlaces(query: string, reports: Report[]): SearchResult {
  const q = norm(query)
  if (!q) return { zone: null, reports }
  const zone = ZONES.find((z) => norm(z.name).includes(q) || norm(z.hint).includes(q) || z.aliases.some((a) => norm(a).includes(q) || q.includes(norm(a)))) ?? null
  const matches = reports.filter((r) => {
    const zn = zoneById(r.zoneId)
    return norm(r.title).includes(q) || norm(r.reference).includes(q) || (zn && (norm(zn.name).includes(q) || zn.aliases.some((a) => norm(a).includes(q)))) || r.id.includes(q)
  })
  return { zone, reports: matches }
}
