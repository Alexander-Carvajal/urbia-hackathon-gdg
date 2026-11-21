import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHandler } from './app.mjs'
import { getOpenMeteoRain, getQrooNotices, getSmnForecast } from './sources.mjs'

const response = (data) => new Response(JSON.stringify(data), { status: 200 })

test('filtra comunicados estatales para Cancún', async () => {
  const posts = [{ id: 12, date: '2026-09-29T12:00:00', link: 'https://qroo.gob.mx/a', title: { rendered: 'Encharcamientos en Cancún' }, excerpt: { rendered: 'Atención en Benito Juárez' } }, { id: 13, date: '2026-09-29T12:00:00', link: 'https://qroo.gob.mx/b', title: { rendered: 'Inundación en Chetumal' }, excerpt: { rendered: 'Quintana Roo' } }]
  const notices = await getQrooNotices(async () => response(posts))
  assert.equal(notices.length, 1)
  assert.equal(notices[0].estado, 'comunicado_no_verificado_como_incidente')
})

test('filtra el pronóstico oficial por Benito Juárez', async () => {
  const rows = [{ nes: 'Quintana Roo', nmun: 'Benito Juárez', hloc: '20261120T13', prec: '2.50', probprec: '80' }, { nes: 'Quintana Roo', nmun: 'Tulum', hloc: '20261120T13', prec: '10', probprec: '90' }]
  const forecast = await getSmnForecast(async () => response(rows))
  assert.deepEqual(forecast.horas, [{ horaLocal: '20261120T13', precipitacionMm: 2.5, probabilidadPct: 80 }])
})

test('conserva los valores de lluvia faltantes', async () => {
  const rain = await getOpenMeteoRain(async () => response({ hourly: { time: ['2026-11-20T12:00', '2026-11-20T13:00'], precipitation: [0, null] } }))
  assert.equal(rain.horas[0].precipitacionMm, 0)
  assert.equal(rain.horas[1].precipitacionMm, null)
})

const handler = createHandler({ qroo: async () => [], smn: async () => { throw new Error('no disponible') }, openMeteo: async () => ({ tipo: 'lluvia_modelada', horas: [] }) })
async function call(path) {
  let status, body
  await handler({ method: 'GET', url: path }, { writeHead(code) { status = code }, end(value) { body = JSON.parse(value) } })
  return { status, body }
}

test('entrega eventos aunque falle una fuente', async () => {
  const { status, body } = await call('/api/inundaciones?desde=2026-09-01&hasta=2026-09-30')
  assert.equal(status, 200)
  assert.equal(body.eventos.length, 1)
  assert.equal(body.estadoFuentes.smn_conagua.disponible, false)
})

test('rechaza parámetros inválidos', async () => {
  assert.equal((await call('/api/inundaciones?limite=200')).status, 400)
  assert.equal((await call('/api/inundaciones?desde=2026-02-30')).status, 400)
})
