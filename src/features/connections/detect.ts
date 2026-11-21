import { CATEGORIES } from '../../data/categories'
import { zoneById } from '../../data/zones'
import { haversine } from '../../lib/geo'
import { isActive } from '../../lib/rules'
import type { CategoryId, Report } from '../../types'

export interface ConnectionParams {
  radiusM: number
  windowDays: number
}

export const DEFAULT_PARAMS: ConnectionParams = { radiusM: 500, windowDays: 7 }

export type ConnectionKind = 'vial' | 'servicio' | 'concentracion' | 'mixta'

export interface Connection {
  id: string
  kind: ConnectionKind
  title: string
  summary: string
  reports: Report[]
  categories: CategoryId[]
  zoneId: string
  zoneName: string
  center: [number, number]
  maxDistanceM: number
  spanHours: number
  priority: 'Alta' | 'Media' | 'Baja'
}

/**
 * Agrupa reportes activos que están a ≤ radio entre sí y ocurrieron dentro de la ventana de tiempo
 * (componentes conexos de un grafo de proximidad). Es determinista y explicable:
 * describe coincidencias observadas, nunca causas.
 */
export function detectConnections(all: Report[], p: ConnectionParams = DEFAULT_PARAMS): Connection[] {
  const rs = all.filter(isActive).sort((a, b) => a.id.localeCompare(b.id))
  const windowMs = p.windowDays * 86400_000
  const parent = rs.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  for (let i = 0; i < rs.length; i++) {
    for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i], b = rs[j]
      const close = haversine(a.lat, a.lng, b.lat, b.lng) <= p.radiusM
      const near = Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) <= windowMs
      if (close && near) parent[find(i)] = find(j)
    }
  }
  const groups = new Map<number, Report[]>()
  rs.forEach((r, i) => { const k = find(i); groups.set(k, [...(groups.get(k) ?? []), r]) })

  const out: Connection[] = []
  for (const g of groups.values()) {
    if (g.length < 2) continue
    const cats = [...new Set(g.map((r) => r.category))].sort() as CategoryId[]
    const count = (c: CategoryId) => g.filter((r) => r.category === c).length
    let kind: ConnectionKind | null = null
    let title = ''
    let summary = ''
    if (count('bache') >= 1 && count('inundacion') >= 1) {
      kind = 'vial'
      title = 'Baches + encharcamientos en una misma zona'
      summary = `${count('bache')} reporte(s) de bache y ${count('inundacion')} de inundación/encharcamiento cercanos. Coincidencia que podría indicar un problema vial conjunto: los baches con agua dejan de ser visibles.`
    } else if (cats.length === 1 && cats[0] === 'agua') {
      kind = 'servicio'
      title = 'Varios reportes de falta de agua cercanos'
      summary = `${g.length} reportes de falta de agua en la misma zona y periodo. Podría tratarse de una incidencia de servicio compartida; URBIA no deduce la causa.`
    } else if (cats.length === 1 && cats[0] === 'inundacion' && g.length >= 3) {
      kind = 'concentracion'
      title = 'Concentración de reportes de inundación'
      summary = `${g.length} reportes de inundación/encharcamiento en un área reducida y en poco tiempo.`
    } else {
      kind = 'mixta'
      title = 'Reportes cercanos en el mismo periodo'
      summary = `${g.length} reportes de ${cats.map((c) => CATEGORIES[c].short.toLowerCase()).join(' y ')} coinciden en lugar y tiempo.`
    }
    let maxD = 0
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) maxD = Math.max(maxD, haversine(g[i].lat, g[i].lng, g[j].lat, g[j].lng))
    const times = g.map((r) => new Date(r.createdAt).getTime())
    const zoneCount = new Map<string, number>()
    g.forEach((r) => zoneCount.set(r.zoneId, (zoneCount.get(r.zoneId) ?? 0) + 1))
    const zoneId = [...zoneCount.entries()].sort((a, b) => b[1] - a[1])[0][0]
    const corroborated = g.filter((r) => r.status === 'corroborado').length
    const priority: Connection['priority'] = g.length >= 3 && corroborated >= 1 ? 'Alta' : corroborated >= 1 || g.length >= 3 ? 'Media' : 'Baja'
    out.push({
      id: 'cx-' + g.map((r) => r.id).sort().join('-'),
      kind, title, summary,
      reports: [...g].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      categories: cats, zoneId, zoneName: zoneById(zoneId)?.name ?? 'Zona sin nombre',
      center: [g.reduce((s, r) => s + r.lat, 0) / g.length, g.reduce((s, r) => s + r.lng, 0) / g.length],
      maxDistanceM: maxD,
      spanHours: (Math.max(...times) - Math.min(...times)) / 3600_000,
      priority,
    })
  }
  const rank = { Alta: 0, Media: 1, Baja: 2 }
  return out.sort((a, b) => rank[a.priority] - rank[b.priority] || b.reports.length - a.reports.length)
}
