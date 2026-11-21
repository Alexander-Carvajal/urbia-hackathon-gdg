import type { Report } from '../../types'

/**
 * Sistema de recompensas: puntos, niveles e insignias.
 * Todo se calcula a partir de los reportes guardados, así no puede desincronizarse
 * ni «inflarse» repitiendo acciones (cada acción solo cuenta una vez).
 */

export const POINTS = {
  report: 10,
  photo: 5,
  confirm: 3,
  objection: 2,
  corroborated: 15,
  imported: 2,
}

export interface Level { n: number; name: string; min: number; color: string }

export const LEVELS: Level[] = [
  { n: 1, name: 'Vecino nuevo', min: 0, color: '#59748D' },
  { n: 2, name: 'Observador', min: 30, color: '#138DE2' },
  { n: 3, name: 'Vigía de barrio', min: 80, color: '#0670C4' },
  { n: 4, name: 'Guardián urbano', min: 160, color: '#9566D7' },
  { n: 5, name: 'Héroe de Cancún', min: 300, color: '#D97706' },
]

export interface Badge {
  id: string
  name: string
  description: string
  emoji: string
  /** progreso actual y meta */
  goal: number
}

export interface Stats {
  reports: number
  baches: number
  inundaciones: number
  agua: number
  photos: number
  confirms: number
  objections: number
  corroborated: number
  zones: number
  imported: number
}

export const BADGES: (Badge & { value: (s: Stats) => number })[] = [
  { id: 'primer-reporte', name: 'Primer paso', emoji: '📍', description: 'Publica tu primer reporte.', goal: 1, value: (s) => s.reports },
  { id: 'cazabaches', name: 'Cazabaches', emoji: '🚧', description: 'Registra 3 baches.', goal: 3, value: (s) => s.baches },
  { id: 'centinela-lluvia', name: 'Centinela de la lluvia', emoji: '🌧️', description: 'Registra 3 zonas encharcadas o inundadas.', goal: 3, value: (s) => s.inundaciones },
  { id: 'guardian-agua', name: 'Guardián del agua', emoji: '💧', description: 'Reporta 2 problemas de agua potable.', goal: 2, value: (s) => s.agua },
  { id: 'ojo-vecino', name: 'Ojo de vecino', emoji: '👀', description: 'Corrobora 5 reportes de otras personas.', goal: 5, value: (s) => s.confirms },
  { id: 'fotografo', name: 'Evidencia clara', emoji: '📸', description: 'Adjunta foto en 3 reportes.', goal: 3, value: (s) => s.photos },
  { id: 'verificado', name: 'Voz confiable', emoji: '🛡️', description: 'Logra que un reporte tuyo sea corroborado por vecinos.', goal: 1, value: (s) => s.corroborated },
  { id: 'explorador', name: 'Explorador urbano', emoji: '🧭', description: 'Reporta en 3 zonas distintas.', goal: 3, value: (s) => s.zones },
  { id: 'datos-abiertos', name: 'Datos abiertos', emoji: '🗂️', description: 'Importa registros desde un documento GeoJSON o CSV.', goal: 1, value: (s) => s.imported },
  { id: 'critico', name: 'Ojo crítico', emoji: '🔎', description: 'Señala 2 reportes con información incorrecta.', goal: 2, value: (s) => s.objections },
]

export interface RewardState {
  stats: Stats
  points: number
  level: Level
  next: Level | null
  /** 0–1 de avance hacia el siguiente nivel */
  progress: number
  badges: (Badge & { current: number; earned: boolean })[]
  earnedIds: string[]
  breakdown: { label: string; count: number; each: number }[]
}

export function computeRewards(reports: Report[], userId: string): RewardState {
  const mine = reports.filter((r) => r.authorId === userId)
  const created = mine.filter((r) => !r.importedFrom)
  const imported = mine.filter((r) => !!r.importedFrom)
  const stats: Stats = {
    reports: created.length,
    baches: created.filter((r) => r.category === 'bache').length,
    inundaciones: created.filter((r) => r.category === 'inundacion').length,
    agua: created.filter((r) => r.category === 'agua').length,
    photos: created.filter((r) => !!r.photo).length,
    confirms: reports.filter((r) => r.confirmedBy.includes(userId)).length,
    objections: reports.filter((r) => r.objections.some((o) => o.by === userId)).length,
    corroborated: mine.filter((r) => r.status === 'corroborado' || r.history.some((h) => h.status === 'corroborado')).length,
    zones: new Set(created.map((r) => r.zoneId)).size,
    imported: imported.length,
  }
  const breakdown = [
    { label: 'Reportes publicados', count: stats.reports, each: POINTS.report },
    { label: 'Reportes con foto', count: stats.photos, each: POINTS.photo },
    { label: 'Corroboraciones', count: stats.confirms, each: POINTS.confirm },
    { label: 'Objeciones', count: stats.objections, each: POINTS.objection },
    { label: 'Reportes tuyos corroborados', count: stats.corroborated, each: POINTS.corroborated },
    { label: 'Registros importados (máx. 20)', count: Math.min(stats.imported, 20), each: POINTS.imported },
  ]
  const points = breakdown.reduce((a, b) => a + b.count * b.each, 0)
  const level = [...LEVELS].reverse().find((l) => points >= l.min) ?? LEVELS[0]
  const next = LEVELS.find((l) => l.min > points) ?? null
  const progress = next ? (points - level.min) / (next.min - level.min) : 1
  const badges = BADGES.map(({ value, ...b }) => { const current = value(stats); return { ...b, current: Math.min(current, b.goal), earned: current >= b.goal } })
  return { stats, points, level, next, progress, badges, earnedIds: badges.filter((b) => b.earned).map((b) => b.id), breakdown }
}
