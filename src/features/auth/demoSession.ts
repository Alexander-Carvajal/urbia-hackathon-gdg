import type { DemoUser } from '../../types'

export interface DemoProfile {
  id: string
  alias: string
  initials: string
  color: string
}

export const DEMO_PROFILES: DemoProfile[] = [
  { id: 'demo-vecina', alias: 'Ana, vecina de Cancún', initials: 'AV', color: '#087DD9' },
  { id: 'demo-ciclista', alias: 'Luis, ciclista urbano', initials: 'LC', color: '#0C8F9B' },
  { id: 'demo-comerciante', alias: 'María, comerciante local', initials: 'MC', color: '#8E5BD6' },
]

export function resolveDemoUser(baseUser: DemoUser, profile: DemoProfile | null, shared: boolean): DemoUser {
  return profile ? { id: shared ? baseUser.id : profile.id, alias: profile.alias } : baseUser
}

const SESSION_KEY = 'urbia-cancun:demo-session:v1'

export function loadDemoSession(): DemoProfile | null {
  try {
    const id = localStorage.getItem(SESSION_KEY)
    return DEMO_PROFILES.find((profile) => profile.id === id) ?? null
  } catch { return null }
}

export function saveDemoSession(id: string): DemoProfile | null {
  const profile = DEMO_PROFILES.find((item) => item.id === id) ?? null
  if (!profile) return null
  try { localStorage.setItem(SESSION_KEY, profile.id) } catch { /* la sesión dura hasta recargar */ }
  return profile
}

export function clearDemoSession(): void {
  try { localStorage.removeItem(SESSION_KEY) } catch { /* sin almacenamiento */ }
}

export function accessUrl(next: string): string {
  return `/acceso?next=${encodeURIComponent(safeReturnPath(next))}`
}

export function safeReturnPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\') || raw.includes('#')) return '/'
  return raw.split('?')[0] === '/acceso' ? '/' : raw
}
