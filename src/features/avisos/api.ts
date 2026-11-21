import { ZONES } from '../../data/zones'
import { norm } from '../../lib/geo'

/**
 * Avisos de Aguakan a partir de la WordPress REST API pública de su portal
 * (https://www2.aguakan.com/wp-json/wp/v2/posts, categoría 7 «Noticias»).
 * El portal responde con CORS habilitado, por eso se consulta directo desde el navegador.
 */
export const AGUAKAN_API = 'https://www2.aguakan.com/wp-json/wp/v2/posts'
export const AGUAKAN_CATEGORY = 7

/** Gobierno del Estado de Quintana Roo: misma API WordPress, con búsqueda de temas de calles y lluvia. */
export const QROO_API = 'https://qroo.gob.mx/wp-json/wp/v2/posts'

export type AvisoSource = 'aguakan' | 'qroo'
export const AVISO_SOURCES: Record<AvisoSource, { label: string; short: string; site: string }> = {
  aguakan: { label: 'Aguakan', short: 'Aguakan', site: 'aguakan.com' },
  qroo: { label: 'Gobierno de Quintana Roo', short: 'Gob. Q. Roo', site: 'qroo.gob.mx' },
}

export type AvisoType = 'corte' | 'fuga' | 'presion' | 'obra' | 'vialidad' | 'lluvia' | 'otro'
export type AvisoCity = 'cancun' | 'otra' | 'general'

export interface Aviso {
  /** Clave única entre fuentes */
  key: string
  source: AvisoSource
  id: number
  date: string // ISO local de Cancún
  link: string
  title: string
  excerpt: string
  text: string
  type: AvisoType
  city: AvisoCity
  cityName: string
  places: { name: string; lat: number; lng: number }[]
}

export const AVISO_TYPES: Record<AvisoType, { label: string; color: string; tint: string; ink: string }> = {
  corte: { label: 'Corte / suspensión', color: '#DC2626', tint: '#FDECEC', ink: '#9B1C1C' },
  fuga: { label: 'Fuga', color: '#138DE2', tint: '#E7F4FD', ink: '#0B5B96' },
  presion: { label: 'Baja presión', color: '#D97706', tint: '#FEF3E2', ink: '#8A4A07' },
  obra: { label: 'Obra / mantenimiento', color: '#6B7280', tint: '#F1F3F5', ink: '#3F4651' },
  vialidad: { label: 'Calles / bacheo', color: '#F28C38', tint: '#FEF1E6', ink: '#8A4410' },
  lluvia: { label: 'Drenaje / inundaciones', color: '#9566D7', tint: '#F2ECFB', ink: '#5B3596' },
  otro: { label: 'Comunicado', color: '#0C3159', tint: '#EAF0F7', ink: '#0C3159' },
}

const TYPE_RULES: [AvisoType, RegExp][] = [
  ['corte', /\b(suspension|suspendera|suspende|corte|cortes|sin servicio|interrupcion|interrumpira|desabasto|sin agua|afectacion en el suministro|restablec)/],
  ['fuga', /\bfuga/],
  ['presion', /baja presion|presion/],
  ['obra', /\b(obra|colector|construccion|rehabilita|mantenimiento|sustitucion|inversion|planta|pozo|tuberia)/],
]

const CITIES: [string, RegExp][] = [
  ['Cancún', /\bcancun\b|benito juarez/],
  ['Playa del Carmen', /playa del carmen|solidaridad/],
  ['Tulum', /\btulum\b/],
  ['Isla Mujeres', /isla mujeres|costa mujeres/],
  ['Puerto Morelos', /puerto morelos/],
  ['Cozumel', /cozumel/],
]

/**
 * Catálogo local de referencias de Cancún con coordenadas APROXIMADAS
 * (se usa para ubicar avisos que mencionan colonias o avenidas).
 */
/** Alias demasiado genéricos para buscarlos en texto libre (p. ej. «juárez» coincide con «Benito Juárez»). */
const GENERIC_ALIASES = new Set(['centro', 'juarez', 'puerto', 'norte', 'poniente', 'regiones', 'malecon', 'aeropuerto', 'hotelera', 'tulum'])

const GAZETTEER: { name: string; lat: number; lng: number; aliases: string[] }[] = [
  ...ZONES.map((z) => ({ name: z.name, lat: z.lat, lng: z.lng, aliases: z.aliases.filter((a) => a.length > 4 && !GENERIC_ALIASES.has(a)) })),
  { name: 'Av. Huayacán', lat: 21.1150, lng: -86.8460, aliases: ['huayacan', 'islazul', 'isla azul'] },
  { name: 'Av. Kabah', lat: 21.1505, lng: -86.8495, aliases: ['kabah'] },
  { name: 'Av. Nichupté', lat: 21.1690, lng: -86.8460, aliases: ['nichupte'] },
  { name: 'Av. Bonampak', lat: 21.1450, lng: -86.8200, aliases: ['bonampak'] },
  { name: 'Av. Andrés Quintana Roo', lat: 21.1660, lng: -86.8600, aliases: ['andres quintana roo', 'av. 20 de noviembre'] },
  { name: 'Av. Chac Mool', lat: 21.1180, lng: -86.8560, aliases: ['chac mool', 'chacmool'] },
  { name: 'Av. Talleres', lat: 21.1770, lng: -86.8500, aliases: ['talleres'] },
  { name: 'Villas Otoch', lat: 21.1720, lng: -86.8850, aliases: ['villas otoch', 'paraiso villas'] },
  { name: 'Alfredo V. Bonfil', lat: 21.0860, lng: -86.8480, aliases: ['bonfil'] },
  { name: 'Av. Arco Norte', lat: 21.1850, lng: -86.8700, aliases: ['arco norte'] },
  { name: 'Av. Las Torres', lat: 21.1420, lng: -86.8650, aliases: ['las torres', 'av. torres'] },
  { name: 'Av. Cancún', lat: 21.1490, lng: -86.8710, aliases: ['av. cancun', 'avenida cancun'] },
  { name: 'Av. La Luna', lat: 21.1460, lng: -86.8590, aliases: ['la luna'] },
  { name: 'Av. Tankah', lat: 21.1610, lng: -86.8400, aliases: ['tankah'] },
  { name: 'Av. Xcaret', lat: 21.1460, lng: -86.8310, aliases: ['xcaret'] },
  { name: 'Av. Yaxchilán', lat: 21.1560, lng: -86.8300, aliases: ['yaxchilan'] },
  { name: 'Av. Labná', lat: 21.1550, lng: -86.8420, aliases: ['labna'] },
  { name: 'Prado Norte', lat: 21.1790, lng: -86.8220, aliases: ['prado norte'] },
  { name: 'Lombardo Toledano', lat: 21.1760, lng: -86.8280, aliases: ['lombardo toledano'] },
  { name: 'PTAR / Zona Sur', lat: 21.1050, lng: -86.8450, aliases: ['ptar sur'] },
  { name: 'Polígono Sur', lat: 21.1080, lng: -86.8700, aliases: ['poligono sur'] },
  { name: 'El Milagro', lat: 21.1530, lng: -86.8780, aliases: ['el milagro'] },
  { name: 'Tierra Maya', lat: 21.1230, lng: -86.8770, aliases: ['tierra maya'] },
  { name: 'Hacienda Real del Caribe', lat: 21.1270, lng: -86.8810, aliases: ['real del caribe'] },
  { name: 'Cielo Nuevo', lat: 21.1850, lng: -86.8880, aliases: ['cielo nuevo'] },
]

const decoder = typeof document !== 'undefined' ? document.createElement('textarea') : null
function htmlToText(html: string): string {
  const noTags = html.replace(/<a [^>]*class="view-article"[^>]*>.*?<\/a>/gi, '').replace(/<[^>]+>/g, ' ')
  if (!decoder) return noTags.replace(/\s+/g, ' ').trim()
  decoder.innerHTML = noTags
  return decoder.value.replace(/\s+/g, ' ').trim()
}

export function classify(text: string): AvisoType {
  const t = norm(text)
  for (const [type, re] of TYPE_RULES) if (re.test(t)) return type
  return 'otro'
}

function detectCity(text: string): { city: AvisoCity; name: string } {
  const t = norm(text)
  const found = CITIES.filter(([, re]) => re.test(t)).map(([n]) => n)
  if (found.includes('Cancún')) return { city: 'cancun', name: 'Cancún' }
  if (found.length) return { city: 'otra', name: found[0] }
  return { city: 'general', name: 'Quintana Roo' }
}

function locate(text: string): Aviso['places'] {
  const t = norm(text)
  const out: Aviso['places'] = []
  for (const g of GAZETTEER) {
    if (g.aliases.some((a) => t.includes(norm(a))) && !out.some((o) => o.name === g.name)) out.push({ name: g.name, lat: g.lat, lng: g.lng })
  }
  return out.slice(0, 3)
}

interface WpPost { id: number; date: string; link: string; title: { rendered: string }; excerpt: { rendered: string }; content?: { rendered: string } }

export function toAviso(p: WpPost, source: AvisoSource = 'aguakan'): Aviso {
  const title = htmlToText(p.title.rendered)
  const excerpt = htmlToText(p.excerpt.rendered).replace(/\s*(…|\.\.\.)\s*$/, '…')
  const text = htmlToText(p.content?.rendered ?? '') || excerpt
  const all = `${title} ${text}`
  const c = detectCity(all)
  // En los comunicados del Estado el tema se decide solo por el título (el cuerpo mezcla muchos temas)
  const type = source === 'qroo' ? classifyStreetsRain(title) : classify(`${title} ${excerpt}`)
  return { key: `${source}-${p.id}`, source, id: p.id, date: p.date, link: p.link, title, excerpt, text, type, city: c.city, cityName: c.name, places: c.city === 'otra' ? [] : locate(all) }
}

// ---------- Gobierno del Estado: calles, baches, drenaje pluvial e inundaciones ----------
const QROO_SEARCHES = ['bacheo', 'encharcamiento', 'inundación', 'pluvial', 'repavimentación', 'rehabilitación vial', 'cárcamo']
const RAIN_RE = /encharca|inunda|pluvial|carcamo|bocas? de tormenta|pozos? de absorcion|drenaje/
const STREET_RE = /bache|bacheo|pavimenta|rehabilitacion (vial|de (la )?(calle|avenida))|\bcalles?\b|\bavenida\b|vialidad/

const CANCUN_RE = /\bcancun\b|benito juarez|cancunense/
const OTHER_CITY_RE = /chetumal|bacalar|tulum|playa del carmen|cozumel|felipe carrillo|isla mujeres|othon p|jose maria morelos|lazaro cardenas|puerto morelos/

export function classifyStreetsRain(text: string): AvisoType {
  const t = norm(text)
  if (RAIN_RE.test(t)) return 'lluvia'
  if (STREET_RE.test(t)) return 'vialidad'
  return 'otro'
}

async function fetchQroo(signal?: AbortSignal): Promise<Aviso[]> {
  const results = await Promise.allSettled(QROO_SEARCHES.map(async (q) => {
    const url = `${QROO_API}?${new URLSearchParams({ search: q, per_page: '12', _fields: 'id,date,link,title,excerpt,content' })}`
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`qroo.gob.mx respondió ${res.status}`)
    return (await res.json()) as WpPost[]
  }))
  const ok = results.filter((r): r is PromiseFulfilledResult<WpPost[]> => r.status === 'fulfilled')
  if (!ok.length) throw (results[0] as PromiseRejectedResult).reason
  const seen = new Set<number>()
  return ok.flatMap((r) => r.value)
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .map((p) => toAviso(p, 'qroo'))
    // Solo comunicados de Cancún / Benito Juárez que realmente traten de calles o lluvia
    // La ciudad debe aparecer en el título o el resumen, y no otra ciudad en el título
    .filter((a) => a.type !== 'otro' && CANCUN_RE.test(norm(`${a.title} ${a.excerpt}`)) && !OTHER_CITY_RE.test(norm(a.title)))
}

async function fetchAguakan(signal?: AbortSignal): Promise<Aviso[]> {
  const url = `${AGUAKAN_API}?categories=${AGUAKAN_CATEGORY}&per_page=40&_fields=id,date,link,title,excerpt,content`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`aguakan.com respondió ${res.status}`)
  return ((await res.json()) as WpPost[]).map((p) => toAviso(p, 'aguakan'))
}

const CACHE_KEY = 'urbia-cancun:avisos-v2'
const CACHE_MS = 20 * 60 * 1000

export interface AvisosResult { avisos: Aviso[]; fetchedAt: string; fromCache: boolean; errors: string[] }

export async function fetchAvisos(force = false, signal?: AbortSignal): Promise<AvisosResult> {
  if (!force) {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as AvisosResult | null
      if (c && Date.now() - Date.parse(c.fetchedAt) < CACHE_MS) return { ...c, fromCache: true }
    } catch { /* sin caché */ }
  }
  const [ag, qr] = await Promise.allSettled([fetchAguakan(signal), fetchQroo(signal)])
  const errors: string[] = []
  const avisos: Aviso[] = []
  if (ag.status === 'fulfilled') avisos.push(...ag.value); else errors.push(`Aguakan: ${(ag.reason as Error).message}`)
  if (qr.status === 'fulfilled') avisos.push(...qr.value); else errors.push(`Gobierno de Q. Roo: ${(qr.reason as Error).message}`)
  if (!avisos.length && errors.length) throw new Error(errors.join(' · '))
  avisos.sort((a, b) => b.date.localeCompare(a.date))
  const out: AvisosResult = { avisos, fetchedAt: new Date().toISOString(), fromCache: false, errors }
  // En caché se guarda sin el texto completo para no llenar el almacenamiento
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ...out, avisos: out.avisos.map((a) => ({ ...a, text: '' })) })) } catch { /* noop */ }
  return out
}

/** Las fechas de WordPress vienen en hora local de Cancún (UTC-5) sin zona. */
export const avisoDate = (d: string) => (/[zZ]|[+-]\d\d:?\d\d$/.test(d) ? d : d + '-05:00')

// ---------- Lluvia (Open-Meteo, sin API key) ----------

export interface RainInfo {
  last24: number
  next24: number
  maxProb: number
  peakHour: string | null
  risk: 'bajo' | 'medio' | 'alto'
  hourly: { time: string; mm: number; prob: number }[]
  /** Condiciones actuales (para la tarjeta «Clima en Cancún») */
  current: { temp: number; feels: number; code: number; isDay: boolean; time: string }
  /** Probabilidad de lluvia en las próximas 3 horas */
  probSoon: number
}

export async function fetchRain(signal?: AbortSignal): Promise<RainInfo> {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=21.1619&longitude=-86.8515&current=temperature_2m,apparent_temperature,weather_code,is_day&hourly=precipitation,precipitation_probability&past_days=1&forecast_days=2&timezone=America%2FCancun'
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`)
  const j = (await res.json()) as { current: { time: string; temperature_2m: number; apparent_temperature: number; weather_code: number; is_day: number }; hourly: { time: string[]; precipitation: (number | null)[]; precipitation_probability: (number | null)[] } }
  // Hora actual en Cancún (UTC-5) con el mismo formato que la API: AAAA-MM-DDTHH:00
  const nowLocal = new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 13) + ':00'
  const idx = Math.max(0, j.hourly.time.findIndex((t) => t >= nowLocal))
  const mm = j.hourly.precipitation.map((v) => v ?? 0)
  const pr = j.hourly.precipitation_probability.map((v) => v ?? 0)
  const sum = (a: number[]) => Math.round(a.reduce((x, y) => x + y, 0) * 10) / 10
  const last24 = sum(mm.slice(Math.max(0, idx - 24), idx))
  const nextMm = mm.slice(idx, idx + 24)
  const next24 = sum(nextMm)
  const maxProb = Math.max(0, ...pr.slice(idx, idx + 24))
  const peak = nextMm.indexOf(Math.max(...nextMm))
  const risk: RainInfo['risk'] = next24 >= 30 || last24 >= 40 ? 'alto' : next24 >= 10 || last24 >= 15 || maxProb >= 70 ? 'medio' : 'bajo'
  return {
    last24, next24, maxProb, risk,
    peakHour: nextMm[peak] > 0 ? j.hourly.time[idx + peak] : null,
    hourly: j.hourly.time.slice(idx, idx + 24).map((time, i) => ({ time, mm: nextMm[i], prob: pr[idx + i] })),
    current: { temp: j.current.temperature_2m, feels: j.current.apparent_temperature, code: j.current.weather_code, isDay: j.current.is_day === 1, time: j.current.time },
    probSoon: Math.max(0, ...pr.slice(idx, idx + 3)),
  }
}

/** Descripción corta del código WMO de Open-Meteo. */
export function weatherLabel(code: number): string {
  if (code === 0) return 'Despejado'
  if (code <= 2) return 'Parcialmente nublado'
  if (code === 3) return 'Nublado'
  if (code <= 48) return 'Niebla'
  if (code <= 57) return 'Llovizna'
  if (code <= 67 || (code >= 80 && code <= 82)) return 'Lluvia'
  if (code >= 95) return 'Tormenta'
  return 'Variable'
}
