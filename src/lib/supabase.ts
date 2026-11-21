import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import type { HistoryEntry, Objection, ObjectionReason, Report, Status } from '../types'

/**
 * Backend compartido con Supabase (Postgres + Auth anónima + Storage + Realtime).
 * Si VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no están definidas, la app sigue
 * funcionando en modo local (localStorage).
 */
const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = URL_ && KEY ? createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null
export const hasSupabase = !!supabase

const PHOTO_BUCKET = 'report-photos'

function client(): SupabaseClient {
  if (!supabase) throw new Error('Supabase no está configurado')
  return supabase
}

/** Sesión anónima: cada navegador obtiene un usuario real de Supabase sin pedir datos personales. */
export async function ensureAuthUser(): Promise<string> {
  const sb = client()
  const { data } = await sb.auth.getSession()
  if (data.session?.user) return data.session.user.id
  const { data: signed, error } = await sb.auth.signInAnonymously()
  if (error || !signed.user) throw new Error(error?.message.includes('Anonymous') ? 'Activa «Anonymous sign-ins» en Supabase (Authentication → Providers).' : error?.message ?? 'No se pudo iniciar sesión anónima')
  return signed.user.id
}

interface ReportRow {
  id: string; category: Report['category']; title: string; description: string; zone_id: string; reference: string
  lat: number; lng: number; accuracy_m: number; created_at: string; status: Status; status_locked: boolean; status_reason: string | null
  source: Report['source']; author_id: string; author_alias: string; base_confirmations: number; base_evidence: number
  photo: string | null; imported_from: string | null; is_demo_seed: boolean
}
interface ConfirmationRow { report_id: string; user_id: string }
interface ObjectionRow { id: string; report_id: string; user_id: string; reason: ObjectionReason; detail: string; created_at: string }
interface HistoryRow { report_id: string; at: string; text: string; by: string; status: Status | null }

async function selectAll<T>(table: string, columns: string, order?: string): Promise<T[]> {
  const sb = client()
  const out: T[] = []
  const page = 1000
  for (let from = 0; ; from += page) {
    let q = sb.from(table).select(columns).range(from, from + page - 1)
    if (order) q = q.order(order, { ascending: true })
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < page) break
  }
  return out
}

export async function fetchReports(): Promise<Report[]> {
  const [rows, conf, obj, hist] = await Promise.all([
    selectAll<ReportRow>('reports', '*'),
    selectAll<ConfirmationRow>('confirmations', 'report_id,user_id'),
    selectAll<ObjectionRow>('objections', 'id,report_id,user_id,reason,detail,created_at'),
    selectAll<HistoryRow>('history', 'report_id,at,text,by,status', 'at'),
  ])
  const group = <T extends { report_id: string }>(xs: T[]) => xs.reduce<Record<string, T[]>>((m, x) => { (m[x.report_id] ??= []).push(x); return m }, {})
  const c = group(conf), o = group(obj), h = group(hist)
  return rows
    .map((r): Report => ({
      id: r.id, title: r.title, category: r.category, description: r.description, zoneId: r.zone_id, reference: r.reference,
      lat: r.lat, lng: r.lng, accuracyM: r.accuracy_m, createdAt: r.created_at, status: r.status, statusLocked: r.status_locked,
      statusReason: r.status_reason ?? undefined, source: r.source, authorId: r.author_id, authorAlias: r.author_alias,
      baseConfirmations: r.base_confirmations, confirmedBy: (c[r.id] ?? []).map((x) => x.user_id), baseEvidence: r.base_evidence,
      photo: r.photo, isDemoSeed: r.is_demo_seed, importedFrom: r.imported_from ?? undefined,
      objections: (o[r.id] ?? []).map((x): Objection => ({ id: x.id, at: x.created_at, reason: x.reason, detail: x.detail, by: x.user_id })),
      history: (h[r.id] ?? []).map((x): HistoryEntry => ({ at: x.at, text: x.text, by: x.by, status: x.status ?? undefined })),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

async function uploadPhoto(uid: string, reportId: string, dataUrl: string): Promise<string> {
  const sb = client()
  const blob = await (await fetch(dataUrl)).blob()
  const path = `${uid}/${reportId}.jpg`
  const { error } = await sb.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw new Error(`Foto: ${error.message}`)
  return sb.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}

const toRow = (r: Report, uid: string, photo: string | null) => ({
  id: r.id, category: r.category, title: r.title, description: r.description, zone_id: r.zoneId, reference: r.reference,
  lat: r.lat, lng: r.lng, accuracy_m: Math.round(r.accuracyM), created_at: r.createdAt, source: r.source,
  author_id: uid, author_alias: r.authorAlias, photo, imported_from: r.importedFrom ?? null,
})

export async function insertReports(reports: Report[]): Promise<void> {
  const uid = await ensureAuthUser()
  const rows = []
  for (const r of reports) rows.push(toRow(r, uid, r.photo?.startsWith('data:') ? await uploadPhoto(uid, r.id, r.photo) : r.photo ?? null))
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await client().from('reports').insert(rows.slice(i, i + 200))
    if (error) throw new Error(error.message)
  }
}

export async function insertConfirmation(reportId: string, alias: string): Promise<void> {
  const uid = await ensureAuthUser()
  const { error } = await client().from('confirmations').insert({ report_id: reportId, user_id: uid, user_alias: alias })
  if (error) throw new Error(error.code === '23505' ? 'Ya habías corroborado este reporte.' : error.message)
}

export async function insertObjection(o: { id: string; reportId: string; reason: ObjectionReason; detail: string; alias: string }): Promise<void> {
  const uid = await ensureAuthUser()
  const { error } = await client().from('objections').insert({ id: o.id, report_id: o.reportId, user_id: uid, user_alias: o.alias, reason: o.reason, detail: o.detail })
  if (error) throw new Error(error.code === '23505' ? 'Ya habías enviado una objeción.' : error.message)
}

/** Escucha cambios de cualquier persona y avisa (con un pequeño retardo para agrupar ráfagas). */
export function subscribeChanges(onChange: () => void): () => void {
  const sb = client()
  let t: ReturnType<typeof setTimeout> | undefined
  const fire = () => { clearTimeout(t); t = setTimeout(onChange, 400) }
  let ch: RealtimeChannel = sb.channel('urbia-changes')
  for (const table of ['reports', 'confirmations', 'objections', 'history']) {
    ch = ch.on('postgres_changes', { event: '*', schema: 'public', table }, fire)
  }
  ch.subscribe()
  return () => { clearTimeout(t); sb.removeChannel(ch) }
}
