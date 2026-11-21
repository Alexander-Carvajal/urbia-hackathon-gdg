import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useToast } from '../../components/ui/Toast'
import { buildSeed } from '../../data/seed'
import { applyRules } from '../../lib/rules'
import { clearState, loadState, loadUser, newId, saveState, saveUser } from '../../lib/storage'
import { ensureAuthUser, fetchReports, hasSupabase, insertConfirmation, insertObjection, insertReports, subscribeChanges } from '../../lib/supabase'
import type { CategoryId, DemoUser, ObjectionReason, Report } from '../../types'

export interface NewReportInput {
  category: CategoryId
  title: string
  description: string
  zoneId: string
  reference: string
  lat: number
  lng: number
  accuracyM: number
  photo: string | null
}

export interface ImportInput extends Omit<NewReportInput, 'photo'> {
  createdAt?: string
}

export type ConfirmResult = 'ok' | 'already' | 'own' | 'closed' | 'missing'

/** local: solo este navegador · supabase: base de datos compartida */
export type Backend = { kind: 'local' } | { kind: 'supabase'; status: 'connecting' | 'online' | 'error'; error?: string }

interface Store {
  reports: Report[]
  user: DemoUser
  persistent: boolean
  backend: Backend
  /** false mientras se cargan los datos remotos */
  ready: boolean
  reload: () => void
  getReport: (id: string) => Report | undefined
  addReport: (input: NewReportInput) => Report
  importReports: (items: ImportInput[], fileName: string) => number
  confirm: (id: string) => ConfirmResult
  object: (id: string, reason: ObjectionReason, detail: string) => boolean
  hasConfirmed: (r: Report) => boolean
  hasObjected: (r: Report) => boolean
  resetDemo: () => void
}

const Ctx = createContext<Store | null>(null)

function initial(): { reports: Report[]; seededAt: string } {
  if (hasSupabase) return { reports: [], seededAt: new Date().toISOString() }
  const s = loadState()
  if (s) return { reports: s.reports, seededAt: s.seededAt }
  return { reports: buildSeed(), seededAt: new Date().toISOString() }
}

export function ReportsProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [user, setUser] = useState(loadUser)
  const [state, setState] = useState(initial)
  const [persistent, setPersistent] = useState(true)
  const [backend, setBackend] = useState<Backend>(hasSupabase ? { kind: 'supabase', status: 'connecting' } : { kind: 'local' })
  const [ready, setReady] = useState(!hasSupabase)
  const alive = useRef(true)

  useEffect(() => {
    if (hasSupabase) return
    setPersistent(saveState({ version: 1, reports: state.reports, seededAt: state.seededAt }))
  }, [state])

  // ---------- Supabase: sesión anónima, carga inicial y tiempo real ----------
  const reload = useCallback(() => {
    if (!hasSupabase) return
    fetchReports()
      .then((reports) => { if (!alive.current) return; setState((s) => ({ ...s, reports })); setReady(true); setBackend({ kind: 'supabase', status: 'online' }) })
      .catch((e: Error) => { if (!alive.current) return; setReady(true); setBackend({ kind: 'supabase', status: 'error', error: e.message }) })
  }, [])

  useEffect(() => {
    alive.current = true
    if (!hasSupabase) return
    let unsub: (() => void) | undefined
    let cancelled = false
    ensureAuthUser()
      .then((uid) => {
        if (cancelled) return
        setUser((u) => { const next = { ...u, id: uid }; saveUser(next); return next })
        reload()
        unsub = subscribeChanges(reload)
      })
      .catch((e: Error) => { if (cancelled) return; setReady(true); setBackend({ kind: 'supabase', status: 'error', error: e.message }) })
    return () => { cancelled = true; alive.current = false; unsub?.() }
  }, [reload])

  /** Ejecuta la escritura remota; si falla, avisa y vuelve a sincronizar con el servidor. */
  const remote = useCallback((task: () => Promise<void>) => {
    if (!hasSupabase) return
    task().then(reload).catch((e: Error) => { toast(`No se pudo guardar en el servidor: ${e.message}`, 'warn'); reload() })
  }, [reload, toast])

  const getReport = useCallback((id: string) => state.reports.find((r) => r.id === id), [state.reports])

  const addReport = useCallback((input: NewReportInput) => {
    const now = new Date().toISOString()
    const r: Report = {
      id: newId(), ...input, title: input.title.trim(), description: input.description.trim(), reference: input.reference.trim(),
      createdAt: now, status: 'pendiente', statusLocked: false, source: 'ciudadania',
      authorId: user.id, authorAlias: user.alias, baseConfirmations: 0, confirmedBy: [], baseEvidence: 0,
      objections: [], history: [{ at: now, text: 'Reporte publicado desde este navegador', by: user.alias, status: 'pendiente' }],
      isDemoSeed: false,
    }
    setState((s) => ({ ...s, reports: [r, ...s.reports] }))
    remote(() => insertReports([r]))
    return r
  }, [user, remote])

  const importReports = useCallback((items: ImportInput[], fileName: string) => {
    const now = new Date().toISOString()
    const created: Report[] = items.map((input) => {
      const at = input.createdAt && !Number.isNaN(Date.parse(input.createdAt)) && Date.parse(input.createdAt) <= Date.now() ? new Date(input.createdAt).toISOString() : now
      return {
        id: newId(), ...input, title: input.title.trim(), description: input.description.trim(), reference: input.reference.trim(),
        createdAt: at, status: 'pendiente', statusLocked: false, source: 'externo', photo: null,
        authorId: user.id, authorAlias: user.alias, baseConfirmations: 0, confirmedBy: [], baseEvidence: 0,
        objections: [], history: [{ at: now, text: `Importado desde el documento «${fileName}»`, by: user.alias, status: 'pendiente' }],
        isDemoSeed: false, importedFrom: fileName,
      }
    })
    setState((s) => ({ ...s, reports: [...created, ...s.reports] }))
    remote(() => insertReports(created))
    return created.length
  }, [user, remote])

  const confirm = useCallback((id: string): ConfirmResult => {
    const r = state.reports.find((x) => x.id === id)
    if (!r) return 'missing'
    if (r.authorId === user.id) return 'own'
    if (r.confirmedBy.includes(user.id)) return 'already'
    if (r.status === 'descartado' || r.status === 'resuelto') return 'closed'
    const now = new Date().toISOString()
    setState((s) => ({
      ...s,
      reports: s.reports.map((x) => x.id !== id ? x : applyRules({
        ...x, confirmedBy: [...x.confirmedBy, user.id],
        history: [...x.history, { at: now, by: user.alias, text: '«Yo también lo observé»: +1 confirmación' }],
      }, 'Regla demo', now)),
    }))
    remote(() => insertConfirmation(id, user.alias))
    return 'ok'
  }, [state.reports, user, remote])

  const object = useCallback((id: string, reason: ObjectionReason, detail: string) => {
    const r = state.reports.find((x) => x.id === id)
    if (!r || r.objections.some((o) => o.by === user.id)) return false
    const now = new Date().toISOString()
    const oid = newId()
    remote(() => insertObjection({ id: oid, reportId: id, reason, detail: detail.trim(), alias: user.alias }))
    setState((s) => ({
      ...s,
      reports: s.reports.map((x) => x.id !== id ? x : {
        ...x,
        objections: [...x.objections, { id: oid, at: now, reason, detail: detail.trim(), by: user.id }],
        history: [...x.history, { at: now, by: user.alias, text: 'Se registró una objeción («Información incorrecta») para revisión comunitaria' }],
      }),
    }))
    return true
  }, [state.reports, user, remote])

  const hasConfirmed = useCallback((r: Report) => r.confirmedBy.includes(user.id), [user])
  const hasObjected = useCallback((r: Report) => r.objections.some((o) => o.by === user.id), [user])

  const resetDemo = useCallback(() => {
    if (hasSupabase) { reload(); return }
    clearState()
    setState({ reports: buildSeed(), seededAt: new Date().toISOString() })
  }, [reload])

  const value = useMemo<Store>(() => ({ reports: state.reports, user, persistent, backend, ready, reload, getReport, addReport, importReports, confirm, object, hasConfirmed, hasObjected, resetDemo }),
    [state.reports, user, persistent, backend, ready, reload, getReport, addReport, importReports, confirm, object, hasConfirmed, hasObjected, resetDemo])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useReports(): Store {
  const v = useContext(Ctx)
  if (!v) throw new Error('useReports debe usarse dentro de ReportsProvider')
  return v
}
