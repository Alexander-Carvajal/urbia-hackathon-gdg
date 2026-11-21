import { RULES, STATUSES } from '../data/categories'
import type { Report, Status } from '../types'

export const confirmationsOf = (r: Report) => r.baseConfirmations + r.confirmedBy.length
export const evidenceOf = (r: Report) => r.baseEvidence + (r.photo ? 1 : 0)
export const isActive = (r: Report) => r.status !== 'resuelto' && r.status !== 'descartado'

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
