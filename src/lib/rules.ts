import { RULES, STATUSES } from '../data/categories'
import type { Report, Status } from '../types'

export const confirmationsOf = (r: Report) => r.baseConfirmations + r.confirmedBy.length
export const evidenceOf = (r: Report) => r.baseEvidence + (r.photo ? 1 : 0)
const FRESHNESS_HOURS = { inundacion: 6, agua: 24, bache: 168 }
export const CONFIRMATION_EVENT = '«Yo también lo observé»: +1 confirmación'

export function lastObservation(r: Report) {
  const observations = [r.createdAt, r.lastConfirmedAt, ...r.history.filter(event => event.text === CONFIRMATION_EVENT).map(event => event.at)]
  return observations.reduce<string>((latest, at) => at && Date.parse(at) > Date.parse(latest) ? at : latest, r.createdAt)
}

export function reportStatus(r: Report): Status {
  if (r.statusLocked || r.status === 'resuelto' || r.status === 'descartado') return r.status
  const observation = Date.parse(lastObservation(r))
  const reviewers = new Set(r.objections.filter(o =>
    o.reason === 'resuelto' && o.by !== r.authorId && Date.parse(o.at) >= observation).map(o => o.by))
  return reviewers.size >= 2 ? 'resuelto' : reviewers.size === 1 ? 'revision' : r.status
}

export function isExpired(r: Report, now = Date.now()) {
  const status = reportStatus(r)
  return !r.isDemoSeed && status !== 'resuelto' && status !== 'descartado'
    && now >= Date.parse(lastObservation(r)) + FRESHNESS_HOURS[r.category] * 3600000
}

export const isActive = (r: Report) => reportStatus(r) !== 'resuelto' && reportStatus(r) !== 'descartado' && !isExpired(r)

/** Estado que corresponde por la regla demo (sin tocar estados fijados manualmente). */
export function statusByRule(r: Report): Status {
  if (r.statusLocked) return r.status
  const c = confirmationsOf(r)
  if (c >= RULES.corroboradoAt && evidenceOf(r) >= RULES.minEvidence) return 'corroborado'
  if (c >= RULES.revisionAt) return 'revision'
  return 'pendiente'
}

/** Recalcula el estado y deja constancia en el historial si cambió. */
export function applyRules(r: Report, by: string, at = new Date().toISOString()): Report {
  const next = statusByRule(r)
  if (next === r.status) return r
  return {
    ...r,
    status: next,
    history: [...r.history, { at, by, status: next, text: `Cambio automático por regla demo: ${STATUSES[next].long}` }],
  }
}

export const RULE_TEXT = `Regla demo: ${RULES.revisionAt}+ confirmaciones → En revisión comunitaria; ${RULES.corroboradoAt}+ confirmaciones y al menos ${RULES.minEvidence} evidencia → Corroborado por vecinos.`
