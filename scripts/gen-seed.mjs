// Genera supabase/seed.sql a partir de los datos de demostración (src/data/seed.ts).
// Uso: npm run seed:sql
// Las fechas se escriben relativas a now(), así el seed siempre queda «reciente».
import { writeFileSync } from 'node:fs'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const { buildSeed } = await server.ssrLoadModule('/src/data/seed.ts')
  const now = Date.now()
  const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
  const ago = (iso) => `now() - interval '${((now - Date.parse(iso)) / 3600_000).toFixed(2)} hours'`
  const lines = [
    '-- Datos de demostración FICTICIOS para URBIA Cancún. Generado por scripts/gen-seed.mjs',
    '-- Ejecuta después de schema.sql. Borra y vuelve a crear solo los reportes demo.',
    'delete from public.reports where is_demo_seed;',
    '',
  ]
  for (const r of buildSeed(now)) {
    lines.push(`insert into public.reports (id, category, title, description, zone_id, reference, lat, lng, accuracy_m, created_at, status, status_locked, status_reason, source, author_id, author_alias, base_confirmations, base_evidence, is_demo_seed) values (${[
      q(r.id), q(r.category), q(r.title), q(r.description), q(r.zoneId), q(r.reference), r.lat, r.lng, r.accuracyM, ago(r.createdAt),
      q(r.status), r.statusLocked, q(r.statusReason ?? null), q(r.source), q(r.authorId), q(r.authorAlias), r.baseConfirmations, r.baseEvidence, 'true',
    ].join(', ')});`)
    for (const h of r.history) {
      lines.push(`insert into public.history (report_id, at, text, by, status) values (${[q(r.id), ago(h.at), q(h.text), q(h.by), q(h.status ?? null)].join(', ')});`)
    }
  }
  writeFileSync('supabase/seed.sql', lines.join('\n') + '\n')
  console.log('supabase/seed.sql generado')
} finally {
  await server.close()
}
