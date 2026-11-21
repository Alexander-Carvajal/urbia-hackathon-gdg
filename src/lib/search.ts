import points from '../data/encharcamientos.json'
import { ZONES, zoneById } from '../data/zones'
import type { Report } from '../types'
import { norm } from './geo'

function words(text: string) {
  return norm(text)
    .replace(/\b(?:super\s*(?:manzana|mza)|s\.?\s*m(?:za)?|spmz|reg(?:ion)?)\.?\s*[-#:]?\s*0*(\d+)\b/g, ' sm$1 ')
    .replace(/\b(?:avenida|avda)\b/g, 'av')
    .replace(/\bfraccionamiento\b/g, 'fracc')
    .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/)
}

export function searchPlaces(query: string, reports: Report[]) {
  const input = query.trim()
  if (!input) return { zone: null, reports, points }
  const terms = words(/^\d{1,3}$/.test(input) ? 'sm' + input : input)
  const matches = (text: string) => {
    const tokens = words(text)
    return terms.every(term => term && tokens.some(token =>
      /\d/.test(term) ? token === term : token.startsWith(term)))
  }
  const zone = ZONES.find(z => [z.name, z.hint, ...z.aliases].some(matches)) ?? null
  return {
    zone,
    reports: reports.filter(r => {
      const z = zoneById(r.zoneId)
      return matches([r.title, r.reference, r.description, z?.name, r.id].join(' ')) || (!!zone && r.zoneId === zone.id)
    }),
    points: points.filter(p => matches(p.address)),
  }
}
