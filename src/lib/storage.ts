import type { DemoUser, Report } from '../types'

/**
 * Capa de persistencia local. Todo vive en localStorage de este navegador.
 * En producción esta capa se reemplazaría por llamadas a un backend (p. ej. Supabase).
 */
const KEY = 'urbia-cancun:v1'
const USER_KEY = 'urbia-cancun:user'
const DRAFT_KEY = 'urbia-cancun:draft'

export interface PersistedState {
  version: 1
  reports: Report[]
  seededAt: string
}

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function safeSet(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true } catch { return false }
}

export function loadState(): PersistedState | null {
  const raw = safeGet(KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PersistedState
    return parsed.version === 1 && Array.isArray(parsed.reports) ? parsed : null
  } catch { return null }
}

export const saveState = (s: PersistedState) => safeSet(KEY, JSON.stringify(s))

export function clearState() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(DRAFT_KEY) } catch { /* sin almacenamiento */ }
}

export function loadUser(): DemoUser {
  const raw = safeGet(USER_KEY)
  if (raw) { try { return JSON.parse(raw) as DemoUser } catch { /* se regenera */ } }
  const n = Math.floor(1000 + Math.random() * 9000)
  const user: DemoUser = { id: 'demo-' + Math.random().toString(36).slice(2, 10), alias: `Vecino demo ${n}` }
  safeSet(USER_KEY, JSON.stringify(user))
  return user
}

export const saveUser = (u: DemoUser) => safeSet(USER_KEY, JSON.stringify(u))

export const loadDraft = <T,>(): T | null => {
  const raw = safeGet(DRAFT_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as T } catch { return null }
}
export const saveDraft = (d: unknown) => safeSet(DRAFT_KEY, JSON.stringify(d))
export const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY) } catch { /* noop */ } }

export const newId = () => 'cun-' + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5)
