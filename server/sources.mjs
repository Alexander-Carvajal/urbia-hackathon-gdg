import { gunzipSync } from 'node:zlib'

async function fetchJson(url, fetchImpl = fetch, timeoutMs = 8000) {
  const response = await fetchImpl(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const body = Buffer.from(await response.arrayBuffer())
  return JSON.parse((body[0] === 0x1f && body[1] === 0x8b ? gunzipSync(body) : body).toString('utf8'))
}

const norm = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const clean = (value) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const number = (value) => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)

export async function getQrooNotices(fetchImpl = fetch) {
  const searches = ['encharcamiento', 'inundación']
  const results = await Promise.allSettled(searches.map(async (search) => {
    const url = `https://qroo.gob.mx/wp-json/wp/v2/posts?${new URLSearchParams({ search, per_page: '20', _fields: 'id,date,link,title,excerpt' })}`
    const data = await fetchJson(url, fetchImpl)
    if (!Array.isArray(data)) throw new Error('Formato inesperado')
    return data
  }))
  const successful = results.filter((result) => result.status === 'fulfilled')
  if (!successful.length) throw new Error(results.map((result) => result.reason?.message).join('; '))
  const seen = new Set()
  return successful.flatMap((result) => result.value).filter((post) => {
    if (!Number.isInteger(post?.id) || seen.has(post.id)) return false
    seen.add(post.id)
    const title = norm(clean(post.title?.rendered))
    const excerpt = norm(clean(post.excerpt?.rendered))
    return /cancun|benito juarez/.test(`${title} ${excerpt}`) && /encharca|inunda/.test(`${title} ${excerpt}`)
      && !/chetumal|tulum|cozumel|playa del carmen|isla mujeres|puerto morelos/.test(title)
  }).map((post) => ({ id: `qroo-${post.id}`, fecha: String(post.date).slice(0, 10), tipo: 'comunicado', titulo: clean(post.title.rendered), descripcion: clean(post.excerpt.rendered), lugares: [], lluviaReportadaMm: null, puntosAtendidos: null, fuente: 'gobierno_quintana_roo', url: post.link, precision: 'ciudad', estado: 'comunicado_no_verificado_como_incidente' }))
}

export async function getSmnForecast(fetchImpl = fetch) {
  const url = 'https://smn.conagua.gob.mx/tools/GUI/webservices/?method=3'
  const data = await fetchJson(url, fetchImpl, 20000)
  if (!Array.isArray(data)) throw new Error('Formato inesperado del SMN')
  const horas = data.filter((row) => norm(row?.nes).includes('quintana roo') && norm(row?.nmun) === 'benito juarez')
    .map((row) => ({ horaLocal: row.hloc ?? null, precipitacionMm: number(row.prec), probabilidadPct: number(row.probprec) }))
    .filter((row) => row.horaLocal)
  if (!horas.length) throw new Error('El SMN no devolvió horas para Benito Juárez')
  return { tipo: 'pronostico', fuente: 'smn_conagua', url, unidad: 'mm', horas }
}

export async function getOpenMeteoRain(fetchImpl = fetch) {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=21.1619&longitude=-86.8515&hourly=precipitation&past_days=1&forecast_days=2&timezone=America%2FCancun'
  const data = await fetchJson(url, fetchImpl)
  const time = data?.hourly?.time
  const precipitation = data?.hourly?.precipitation
  if (!Array.isArray(time) || !Array.isArray(precipitation) || time.length !== precipitation.length) throw new Error('Formato inesperado de Open-Meteo')
  const nowLocal = new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 13)
  return { tipo: 'lluvia_modelada', fuente: 'open_meteo', url, unidad: 'mm', horas: time.map((hour, i) => ({ horaLocal: hour, precipitacionMm: number(precipitation[i]), periodo: hour.slice(0, 13) < nowLocal ? 'pasado_modelado' : 'pronostico' })) }
}
