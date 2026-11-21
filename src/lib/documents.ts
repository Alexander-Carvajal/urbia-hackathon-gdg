import { CATEGORIES } from '../data/categories'
import { zoneById } from '../data/zones'
import type { ImportInput } from '../features/reports/store'
import type { CategoryId, Report } from '../types'
import { confirmationsOf, evidenceOf } from './rules'
import { inCancunArea, nearestZone, norm } from './geo'

/**
 * Registro de baches y zonas encharcadas/inundadas a partir de documentos.
 * Formatos aceptados: GeoJSON (FeatureCollection de puntos) y CSV con columnas lat/lng.
 */

export interface ParseResult {
  items: ImportInput[]
  skipped: { row: number; reason: string }[]
}

const CATEGORY_WORDS: [CategoryId, string[]][] = [
  ['bache', ['bache', 'baches', 'pothole', 'hundimiento', 'socavon', 'pavimento']],
  ['inundacion', ['inundacion', 'inundaciones', 'encharcamiento', 'encharcada', 'encharcado', 'charco', 'flood', 'anegado']],
  ['agua', ['agua', 'falta de agua', 'sin agua', 'fuga', 'desabasto', 'water']],
]

export function guessCategory(raw: unknown): CategoryId | null {
  const t = norm(String(raw ?? ''))
  if (!t) return null
  for (const [id, words] of CATEGORY_WORDS) if (words.some((w) => t === w || t.includes(w))) return id
  return null
}

const pick = (o: Record<string, unknown>, keys: string[]) => {
  for (const k of Object.keys(o)) if (keys.includes(norm(k))) { const v = o[k]; if (v !== undefined && v !== null && String(v).trim() !== '') return v }
  return undefined
}

const K = {
  cat: ['categoria', 'category', 'tipo', 'type', 'clase'],
  title: ['titulo', 'title', 'nombre', 'name'],
  desc: ['descripcion', 'description', 'detalle', 'comentario', 'notas'],
  ref: ['referencia', 'reference', 'direccion', 'address', 'calle', 'ubicacion'],
  date: ['fecha', 'date', 'created_at', 'createdat', 'creado'],
  lat: ['lat', 'latitud', 'latitude', 'y'],
  lng: ['lng', 'lon', 'long', 'longitud', 'longitude', 'x'],
  zone: ['zona', 'zone', 'zoneid'],
}

function toItem(props: Record<string, unknown>, lat: number, lng: number, row: number, skipped: ParseResult['skipped'], fallback: CategoryId | null): ImportInput | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) { skipped.push({ row, reason: 'Coordenadas inválidas' }); return null }
  if (!inCancunArea(lat, lng)) { skipped.push({ row, reason: 'Fuera del área de Cancún' }); return null }
  const category = guessCategory(pick(props, K.cat)) ?? guessCategory(pick(props, K.title)) ?? fallback
  if (!category) { skipped.push({ row, reason: 'Categoría no reconocida (usa bache, inundacion o agua)' }); return null }
  const zoneRaw = pick(props, K.zone)
  const zone = (zoneRaw && zoneById(String(zoneRaw))) || nearestZone(lat, lng)
  const title = String(pick(props, K.title) ?? `${CATEGORIES[category].label} registrado desde documento`).slice(0, 80)
  const description = String(pick(props, K.desc) ?? 'Registro importado desde un documento externo; pendiente de corroboración vecinal.')
  const date = pick(props, K.date)
  return {
    category, title, description, zoneId: zone.id, reference: String(pick(props, K.ref) ?? ''),
    lat, lng, accuracyM: 50, createdAt: date ? String(date) : undefined,
  }
}

/** CSV sencillo con comillas dobles; detecta separador «,» o «;». */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '')
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? ''
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = [], cell = '', q = false
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (q) {
      if (ch === '"' && clean[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') q = false
      else cell += ch
    } else if (ch === '"') q = true
    else if (ch === sep) { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim() !== '')) rows.push(row)
  return rows
}

export function parseDocument(text: string, fileName: string, fallback: CategoryId | null = null): ParseResult {
  const skipped: ParseResult['skipped'] = []
  const items: ImportInput[] = []
  const isJson = /\.(geo)?json$/i.test(fileName) || text.trim().startsWith('{')
  if (isJson) {
    let data: unknown
    try { data = JSON.parse(text) } catch { throw new Error('El archivo no es un JSON válido.') }
    const d = data as { type?: string; features?: unknown[] }
    const features = d.type === 'FeatureCollection' && Array.isArray(d.features) ? d.features : d.type === 'Feature' ? [d] : null
    if (!features) throw new Error('Se esperaba un GeoJSON de tipo FeatureCollection.')
    features.forEach((f, i) => {
      const ft = f as { geometry?: { type?: string; coordinates?: unknown }; properties?: Record<string, unknown> }
      const g = ft.geometry
      let coords: number[] | null = null
      if (g?.type === 'Point' && Array.isArray(g.coordinates)) coords = g.coordinates as number[]
      else if ((g?.type === 'Polygon' || g?.type === 'LineString' || g?.type === 'MultiPoint') && Array.isArray(g.coordinates)) {
        // Centroide simple de los vértices para zonas encharcadas dibujadas como polígono o línea
        const pts = (g.type === 'Polygon' ? (g.coordinates as number[][][])[0] : (g.coordinates as number[][])) ?? []
        if (pts.length) coords = [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length]
      }
      if (!coords) { skipped.push({ row: i + 1, reason: 'Geometría no soportada' }); return }
      const it = toItem(ft.properties ?? {}, Number(coords[1]), Number(coords[0]), i + 1, skipped, fallback)
      if (it) items.push(it)
    })
  } else {
    const rows = parseCsv(text)
    if (rows.length < 2) throw new Error('El CSV necesita una fila de encabezados y al menos un registro.')
    const head = rows[0].map((h) => h.trim())
    rows.slice(1).forEach((cells, i) => {
      const props: Record<string, unknown> = {}
      head.forEach((h, j) => { props[h] = cells[j]?.trim() })
      const lat = Number(String(pick(props, K.lat) ?? '').replace(',', '.'))
      const lng = Number(String(pick(props, K.lng) ?? '').replace(',', '.'))
      const it = toItem(props, lat, lng, i + 2, skipped, fallback)
      if (it) items.push(it)
    })
  }
  return { items, skipped }
}

// ---------- Exportación ----------

export function toGeoJson(reports: Report[]) {
  return {
    type: 'FeatureCollection',
    name: 'urbia-cancun-reportes',
    features: reports.map((r) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [Number(r.lng.toFixed(6)), Number(r.lat.toFixed(6))] },
      properties: {
        id: r.id, categoria: r.category, titulo: r.title, descripcion: r.description, zona: r.zoneId,
        referencia: r.reference, estado: r.status, confirmaciones: confirmationsOf(r), evidencias: evidenceOf(r),
        fecha: r.createdAt, origen: r.source, precision_m: r.accuracyM,
      },
    })),
  }
}

const csvCell = (v: unknown) => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

export function toCsv(reports: Report[]): string {
  const head = ['id', 'categoria', 'titulo', 'descripcion', 'zona', 'referencia', 'lat', 'lng', 'estado', 'confirmaciones', 'fecha', 'origen']
  const lines = reports.map((r) => [r.id, r.category, r.title, r.description, r.zoneId, r.reference, r.lat.toFixed(6), r.lng.toFixed(6), r.status, confirmationsOf(r), r.createdAt, r.source].map(csvCell).join(','))
  return '﻿' + [head.join(','), ...lines].join('\n')
}

export const CSV_TEMPLATE = '﻿' + [
  'categoria,titulo,descripcion,referencia,lat,lng,fecha',
  'bache,Bache en carril derecho,Bache de 50 cm frente a la parada,Av. Kabah esquina Nichupté,21.1452,-86.8481,2026-11-18',
  'inundacion,Calle encharcada,Agua acumulada de 20 cm tras la lluvia,SM 64 calle 12,21.1569,-86.8352,2026-11-19',
].join('\n')

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
