import { useEffect, useMemo, useState } from 'react'
import { ImageOverlay } from 'react-leaflet'
import { confirmationsOf } from '../../lib/rules'
import type { Report } from '../../types'

/**
 * Capas de mapa de calor dibujadas en un <canvas> y montadas como ImageOverlay:
 *  - Densidad de reportes (estimación de densidad con núcleo gaussiano)
 *  - Temperatura y sensación térmica (Open-Meteo, interpolación IDW entre puntos)
 */

/** Área que cubren las capas (Cancún urbano y Zona Hotelera). */
export const HEAT_BOUNDS: [[number, number], [number, number]] = [[21.03, -86.96], [21.26, -86.73]]
const [[S, W], [N, E]] = HEAT_BOUNDS
const KM_PER_DEG_LAT = 111.32
const KM_PER_DEG_LNG = 111.32 * Math.cos((21.15 * Math.PI) / 180)

type RGB = [number, number, number]
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
function ramp(stops: [number, RGB][], t: number): RGB {
  const x = Math.min(1, Math.max(0, t))
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) {
      const [t0, c0] = stops[i - 1], [t1, c1] = stops[i]
      const k = (x - t0) / (t1 - t0 || 1)
      return [lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k)]
    }
  }
  return stops[stops.length - 1][1]
}

export const DENSITY_STOPS: [number, RGB][] = [[0, [255, 237, 160]], [0.35, [254, 178, 76]], [0.65, [240, 59, 32]], [1, [128, 0, 90]]]
export const TEMP_STOPS: [number, RGB][] = [[0, [49, 130, 189]], [0.3, [116, 196, 118]], [0.55, [254, 224, 139]], [0.8, [244, 109, 67]], [1, [165, 0, 38]]]
export const cssGradient = (stops: [number, RGB][]) => `linear-gradient(90deg, ${stops.map(([t, c]) => `rgb(${c.map(Math.round).join(',')}) ${t * 100}%`).join(', ')})`

/** Pinta un campo escalar sobre HEAT_BOUNDS en un canvas y devuelve un data URL PNG. */
function paint(w: number, h: number, stops: [number, RGB][], value: (lat: number, lng: number) => { t: number; a: number } | null): string {
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const img = ctx.createImageData(w, h)
  for (let y = 0; y < h; y++) {
    const lat = N - ((y + 0.5) / h) * (N - S)
    for (let x = 0; x < w; x++) {
      const v = value(lat, W + ((x + 0.5) / w) * (E - W))
      if (!v) continue
      const [r, g, b] = ramp(stops, v.t)
      const i = (y * w + x) * 4
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = Math.round(v.a * 255)
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}

// ---------- Densidad de reportes ----------

/** Peso de cada reporte: más confirmaciones = más peso (tope 3×). */
const weightOf = (r: Report) => Math.min(3, 1 + confirmationsOf(r) * 0.25)

export function ReportDensityLayer({ reports, radiusM = 750, opacity = 0.75 }: { reports: Report[]; radiusM?: number; opacity?: number }) {
  const url = useMemo(() => {
    if (!reports.length) return null
    const sigma = radiusM / 1000
    const pts = reports.map((r) => ({ lat: r.lat, lng: r.lng, w: weightOf(r) }))
    const field = (lat: number, lng: number) => {
      let s = 0
      for (const p of pts) {
        const dx = (lng - p.lng) * KM_PER_DEG_LNG, dy = (lat - p.lat) * KM_PER_DEG_LAT
        const d2 = dx * dx + dy * dy
        if (d2 < 9 * sigma * sigma) s += p.w * Math.exp(-d2 / (2 * sigma * sigma))
      }
      return s
    }
    // Normaliza con el máximo observado en una rejilla gruesa
    let max = 0
    for (let i = 0; i <= 60; i++) for (let j = 0; j <= 60; j++) max = Math.max(max, field(S + (i / 60) * (N - S), W + (j / 60) * (E - W)))
    for (const p of pts) max = Math.max(max, field(p.lat, p.lng))
    if (max <= 0) return null
    return paint(300, 300, DENSITY_STOPS, (lat, lng) => {
      const t = field(lat, lng) / max
      if (t < 0.04) return null
      return { t, a: Math.min(1, 0.25 + t * 0.75) * Math.min(1, t * 6) }
    })
  }, [reports, radiusM])
  if (!url) return null
  return <ImageOverlay url={url} bounds={HEAT_BOUNDS} opacity={opacity} zIndex={350} interactive={false} />
}

// ---------- Temperatura (Open-Meteo) ----------

export interface TempPoint { lat: number; lng: number; temp: number; feels: number }
export interface TempData { points: TempPoint[]; time: string; min: number; max: number }

const GRID = 6
const TEMP_CACHE = 'urbia-cancun:temp-grid'

export async function fetchTemperatureGrid(signal?: AbortSignal): Promise<TempData> {
  try {
    const c = JSON.parse(localStorage.getItem(TEMP_CACHE) ?? 'null') as (TempData & { at: number }) | null
    if (c && Date.now() - c.at < 30 * 60_000) return c
  } catch { /* sin caché */ }
  const lats: number[] = [], lngs: number[] = []
  for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) {
    lats.push(+(S + (i + 0.5) * ((N - S) / GRID)).toFixed(4))
    lngs.push(+(W + (j + 0.5) * ((E - W) / GRID)).toFixed(4))
  }
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats.join(',')}&longitude=${lngs.join(',')}&current=temperature_2m,apparent_temperature&timezone=America%2FCancun`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`)
  const arr = (await res.json()) as { current: { time: string; temperature_2m: number; apparent_temperature: number } }[]
  // Se usan las coordenadas pedidas (la API devuelve la celda del modelo más cercana)
  const points = arr.map((d, k) => ({ lat: lats[k], lng: lngs[k], temp: d.current.temperature_2m, feels: d.current.apparent_temperature }))
  const temps = points.map((p) => p.temp)
  const data: TempData = { points, time: arr[0]?.current.time ?? '', min: Math.min(...temps), max: Math.max(...temps) }
  try { localStorage.setItem(TEMP_CACHE, JSON.stringify({ ...data, at: Date.now() })) } catch { /* noop */ }
  return data
}

export type TempMode = 'temp' | 'feels'

export function useTemperature(enabled: boolean) {
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'ok' | 'error'; data?: TempData; error?: string }>({ status: 'idle' })
  useEffect(() => {
    if (!enabled || state.status === 'ok' || state.status === 'loading') return
    const ac = new AbortController()
    setState({ status: 'loading' })
    fetchTemperatureGrid(ac.signal)
      .then((data) => setState({ status: 'ok', data }))
      .catch((e: Error) => { if (!ac.signal.aborted) setState({ status: 'error', error: e.message }) })
    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])
  return state
}

/**
 * Escala ajustada a los valores actuales (mínimo 3 °C de amplitud): dentro de la ciudad
 * las diferencias suelen ser de 1–3 °C y una escala fija las volvería invisibles.
 */
export function tempRange(data: TempData, mode: TempMode): [number, number] {
  const vals = data.points.map((p) => (mode === 'temp' ? p.temp : p.feels))
  const min = Math.min(...vals), max = Math.max(...vals)
  const mid = (min + max) / 2, half = Math.max(1.5, (max - min) / 2 + 0.3)
  return [Math.floor((mid - half) * 2) / 2, Math.ceil((mid + half) * 2) / 2]
}

export function TemperatureLayer({ data, mode, opacity = 0.55 }: { data: TempData; mode: TempMode; opacity?: number }) {
  const url = useMemo(() => {
    const pts = data.points.map((p) => ({ lat: p.lat, lng: p.lng, v: mode === 'temp' ? p.temp : p.feels }))
    const [lo, hi] = tempRange(data, mode)
    return paint(160, 160, TEMP_STOPS, (lat, lng) => {
      // Interpolación por distancia inversa (IDW, potencia 2)
      let num = 0, den = 0
      for (const p of pts) {
        const dx = (lng - p.lng) * KM_PER_DEG_LNG, dy = (lat - p.lat) * KM_PER_DEG_LAT
        const d2 = dx * dx + dy * dy
        if (d2 < 1e-6) return { t: (p.v - lo) / (hi - lo), a: 1 }
        const w = 1 / d2
        num += w * p.v; den += w
      }
      return { t: (num / den - lo) / (hi - lo), a: 1 }
    })
  }, [data, mode])
  return <ImageOverlay url={url} bounds={HEAT_BOUNDS} opacity={opacity} zIndex={340} interactive={false} />
}
