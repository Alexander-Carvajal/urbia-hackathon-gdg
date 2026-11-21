import http from 'node:http'
import { municipalIncidents } from './incidents.mjs'
import { getOpenMeteoRain, getQrooNotices, getSmnForecast } from './sources.mjs'

const SOURCES = [
  { id: 'municipio_benito_juarez', nombre: 'Municipio de Benito Juárez', clase: 'comunicados_historicos', url: 'https://cancun.gob.mx/' },
  { id: 'gobierno_quintana_roo', nombre: 'Gobierno de Quintana Roo', clase: 'comunicados', url: 'https://qroo.gob.mx/' },
  { id: 'smn_conagua', nombre: 'Servicio Meteorológico Nacional', clase: 'pronostico', url: 'https://smn.conagua.gob.mx/es/web-service-api' },
  { id: 'open_meteo', nombre: 'Open-Meteo', clase: 'lluvia_modelada', url: 'https://open-meteo.com/en/docs' },
]

function cache(loader, ttlMs) {
  let value, updated = 0, pending
  return async () => {
    if (value && Date.now() - updated < ttlMs) return { value, cached: true, updatedAt: new Date(updated).toISOString() }
    if (!pending) pending = loader().then((next) => { value = next; updated = Date.now(); return next }).finally(() => { pending = null })
    try { return { value: await pending, cached: false, updatedAt: new Date(updated).toISOString() } }
    catch (error) {
      if (value) return { value, cached: true, stale: true, updatedAt: new Date(updated).toISOString(), error: error.message }
      throw error
    }
  }
}

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' })
  response.end(JSON.stringify(body))
}

function validDate(value) {
  if (value === null) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function createHandler({ qroo = getQrooNotices, smn = getSmnForecast, openMeteo = getOpenMeteoRain } = {}) {
  const cachedQroo = cache(qroo, 20 * 60000)
  const cachedSmn = cache(smn, 60 * 60000)
  const cachedMeteo = cache(openMeteo, 20 * 60000)
  return async (request, response) => {
    if (request.method === 'OPTIONS') { response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' }); response.end(); return }
    if (request.method !== 'GET') return send(response, 405, { error: 'Método no permitido' })
    const url = new URL(request.url, 'http://localhost')
    if (url.pathname === '/api/health') return send(response, 200, { ok: true })
    if (url.pathname === '/api/inundaciones/fuentes') return send(response, 200, { ciudad: 'Cancún', fuentes: SOURCES })
    if (url.pathname !== '/api/inundaciones') return send(response, 404, { error: 'Ruta no encontrada' })

    const from = url.searchParams.get('desde'), to = url.searchParams.get('hasta'), source = url.searchParams.get('fuente')
    const limitRaw = url.searchParams.get('limite'), limit = limitRaw === null ? 50 : Number(limitRaw)
    if (!validDate(from) || !validDate(to) || (from && to && from > to) || !Number.isInteger(limit) || limit < 1 || limit > 100 || (source && !SOURCES.some((s) => s.id === source))) {
      return send(response, 400, { error: 'Parámetros inválidos: desde/hasta YYYY-MM-DD, fuente conocida y limite entre 1 y 100' })
    }

    const [qr, sm, om] = await Promise.allSettled([cachedQroo(), cachedSmn(), cachedMeteo()])
    const estadoFuentes = { municipio_benito_juarez: { disponible: true, actualizado: 'selección documental verificada' } }
    for (const [name, result] of [['gobierno_quintana_roo', qr], ['smn_conagua', sm], ['open_meteo', om]]) {
      estadoFuentes[name] = result.status === 'fulfilled'
        ? { disponible: true, cache: result.value.cached, desactualizado: !!result.value.stale, consultadoEn: result.value.updatedAt, ...(result.value.error ? { error: result.value.error } : {}) }
        : { disponible: false, error: result.reason?.message ?? String(result.reason) }
    }
    const eventos = [...municipalIncidents, ...(qr.status === 'fulfilled' ? qr.value.value : [])]
      .filter((event) => (!from || event.fecha >= from) && (!to || event.fecha <= to) && (!source || event.fuente === source))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
    const meteorologia = source && !['smn_conagua', 'open_meteo'].includes(source) ? {} : {
      ...(sm.status === 'fulfilled' && (!source || source === 'smn_conagua') ? { smn: sm.value.value } : {}),
      ...(om.status === 'fulfilled' && (!source || source === 'open_meteo') ? { openMeteo: om.value.value } : {}),
    }
    send(response, 200, { ciudad: 'Cancún', municipio: 'Benito Juárez', zonaHoraria: 'America/Cancun', generadoEn: new Date().toISOString(), total: eventos.length, eventos: eventos.slice(0, limit), meteorologia, estadoFuentes, nota: 'Los eventos son históricos o comunicados; no indican calles inundadas ahora. La lluvia modelada y los pronósticos no prueban inundaciones.' })
  }
}

export function createServer(options) { return http.createServer(createHandler(options)) }
