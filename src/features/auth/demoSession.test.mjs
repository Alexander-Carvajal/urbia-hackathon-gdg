import test from 'node:test'
import assert from 'node:assert/strict'
import { accessUrl, clearDemoSession, DEMO_PROFILES, loadDemoSession, resolveDemoUser, saveDemoSession, safeReturnPath } from './demoSession.ts'

test('un perfil demo conserva su alias tras recargar y se elimina al cerrar sesión', () => {
  const entries = new Map()
  entries.set('urbia-cancun:v1', 'reportes guardados')
  const previous = globalThis.localStorage
  globalThis.localStorage = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  }
  try {
    assert.equal(loadDemoSession(), null)
    assert.equal(saveDemoSession('demo-vecina')?.alias, 'Ana, vecina de Cancún')
    assert.equal(loadDemoSession()?.id, 'demo-vecina')
    assert.equal(saveDemoSession('perfil-desconocido'), null)
    assert.equal(loadDemoSession()?.id, 'demo-vecina')
    clearDemoSession()
    assert.equal(loadDemoSession(), null)
    assert.equal(entries.get('urbia-cancun:v1'), 'reportes guardados')
  } finally {
    globalThis.localStorage = previous
  }
})

test('el retorno conserva rutas internas sin permitir redirecciones externas', () => {
  assert.equal(accessUrl('/reportes/cun-123?origen=mapa'), '/acceso?next=%2Freportes%2Fcun-123%3Forigen%3Dmapa')
  assert.equal(safeReturnPath(new URLSearchParams(accessUrl('/datos').split('?')[1]).get('next')), '/datos')
  for (const path of ['https://example.com', '//example.com', '/\\example.com', '/acceso', '/mapa#otro']) {
    assert.equal(safeReturnPath(path), '/')
  }
})

test('el perfil local tiene ID estable y en Supabase conserva el UID anónimo', () => {
  const base = { id: 'uid-anonimo', alias: 'Vecino demo' }
  const profile = DEMO_PROFILES[0]
  assert.deepEqual(resolveDemoUser(base, profile, false), { id: profile.id, alias: profile.alias })
  assert.deepEqual(resolveDemoUser(base, profile, true), { id: base.id, alias: profile.alias })
  assert.equal(resolveDemoUser(base, null, true), base)
})
