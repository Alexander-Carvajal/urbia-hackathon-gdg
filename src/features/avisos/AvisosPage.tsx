import { WaterloggingDirectory } from '../../components/map/WaterloggingLayer'
import { CloudRain, ExternalLink, Loader2, MapPin, RefreshCw, TriangleAlert, Umbrella } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { UrbiaMap } from '../../components/map/UrbiaMap'
import { Notice, PageHeader } from '../../components/ui'
import { fullDate, relativeTime } from '../../lib/format'
import { AVISO_SOURCES, AVISO_TYPES, avisoDate, type AvisoSource, type AvisoType, type RainInfo } from './api'
import { AvisosLayer, useAvisos } from './AvisosProvider'

const RISK = {
  bajo: { label: 'Riesgo bajo de encharcamientos', bg: '#EAF7FF', fg: '#0A4F87' },
  medio: { label: 'Riesgo medio de encharcamientos', bg: '#FEF3E2', fg: '#8A4A07' },
  alto: { label: 'Riesgo alto de inundaciones', bg: '#FDECEC', fg: '#9B1C1C' },
}

export function RainCard({ compact = false }: { compact?: boolean }) {
  const { rain } = useAvisos()
  if (rain.status === 'loading' && !rain.data) return <div className="card flex items-center gap-3 p-4 text-sm text-muted"><Loader2 size={18} className="animate-spin" /> Consultando pronóstico de lluvia…</div>
  if (!rain.data) return <div className="card p-4 text-sm text-muted">No se pudo consultar el pronóstico de lluvia (Open-Meteo).</div>
  const r: RainInfo = rain.data
  const k = RISK[r.risk]
  const max = Math.max(1, ...r.hourly.map((h) => h.mm))
  return (
    <section className="card flex flex-col gap-3 p-4" aria-labelledby="rain-title">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: k.bg }}><CloudRain size={21} style={{ color: k.fg }} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h2 id="rain-title" className="text-[15px] font-bold">Lluvia en Cancún</h2>
          <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: k.bg, color: k.fg }}>{k.label}</span>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-bg px-2 py-2"><dt className="text-[11px] text-muted">Últimas 24 h</dt><dd className="font-display text-lg font-extrabold">{r.last24} mm</dd></div>
        <div className="rounded-xl bg-bg px-2 py-2"><dt className="text-[11px] text-muted">Próximas 24 h</dt><dd className="font-display text-lg font-extrabold">{r.next24} mm</dd></div>
        <div className="rounded-xl bg-bg px-2 py-2"><dt className="text-[11px] text-muted">Prob. máx.</dt><dd className="font-display text-lg font-extrabold">{r.maxProb}%</dd></div>
      </dl>
      {!compact && (
        <div aria-label="Lluvia esperada por hora, próximas 24 horas" role="img" className="flex h-16 items-end gap-[2px]">
          {r.hourly.map((h) => (
            <div key={h.time} title={`${h.time.slice(11, 16)} · ${h.mm} mm · ${h.prob}%`} className="flex-1 rounded-t-sm bg-[#9566D7]" style={{ height: `${Math.max(3, (h.mm / max) * 100)}%`, opacity: h.mm > 0 ? 0.9 : 0.18 }} />
          ))}
        </div>
      )}
      <p className="help">
        {r.peakHour ? <>Mayor lluvia esperada hacia las {r.peakHour.slice(11, 16)} h. </> : 'Sin lluvia significativa prevista. '}
        Fuente: Open-Meteo (modelo meteorológico, no oficial).
      </p>
      {r.risk !== 'bajo' && <Link to="/reportar" className="btn btn-secondary self-start !min-h-10 text-sm"><Umbrella size={16} aria-hidden="true" /> Reportar zona encharcada</Link>}
    </section>
  )
}

type CityFilter = 'cancun' | 'todas'

export function AvisosPage() {
  const { avisos, refresh } = useAvisos()
  const [type, setType] = useState<AvisoType | 'todos'>('todos')
  const [city, setCity] = useState<CityFilter>('cancun')
  const [source, setSource] = useState<AvisoSource | 'todas'>('todas')

  const base = useMemo(() => (avisos.data ?? [])
    .filter((a) => (city === 'todas' ? true : a.city !== 'otra'))
    .filter((a) => (source === 'todas' ? true : a.source === source)), [avisos.data, city, source])
  const list = useMemo(() => base.filter((a) => (type === 'todos' ? true : a.type === type)), [base, type])
  const located = list.filter((a) => a.places.length > 0)
  const counts = (t: AvisoType | 'todos') => base.filter((a) => t === 'todos' || a.type === t).length
  const typeOpts = (['todos', 'corte', 'fuga', 'presion', 'vialidad', 'lluvia', 'obra', 'otro'] as const).filter((t) => t === 'todos' || t === type || counts(t) > 0)

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-8 md:py-7">
      <PageHeader title="Avisos oficiales" subtitle="Agua (Aguakan), calles y drenaje pluvial (Gobierno de Quintana Roo) y pronóstico de lluvia para anticipar encharcamientos."
        actions={<button type="button" className="btn btn-secondary" onClick={refresh} disabled={avisos.status === 'loading'}>
          <RefreshCw size={16} className={avisos.status === 'loading' ? 'animate-spin' : ''} aria-hidden="true" /> Actualizar
        </button>} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Filtrar por tipo de aviso" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
              {typeOpts.map((t) => (
                <button key={t} type="button" className="chip" aria-pressed={type === t} onClick={() => setType(t)}>
                  {t !== 'todos' && <span className="h-2.5 w-2.5 rounded-full" style={{ background: AVISO_TYPES[t].color }} aria-hidden="true" />}
                  {t === 'todos' ? 'Todos' : AVISO_TYPES[t].label}<span className="opacity-70">{counts(t)}</span>
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor="aviso-source">Fuente</label>
            <select id="aviso-source" className="input !w-auto md:ml-auto" value={source} onChange={(e) => setSource(e.target.value as AvisoSource | 'todas')}>
              <option value="todas">Todas las fuentes</option>
              {(Object.keys(AVISO_SOURCES) as AvisoSource[]).map((s) => <option key={s} value={s}>{AVISO_SOURCES[s].label}</option>)}
            </select>
            <label className="sr-only" htmlFor="aviso-city">Ciudad</label>
            <select id="aviso-city" className="input !w-auto" value={city} onChange={(e) => setCity(e.target.value as CityFilter)}>
              <option value="cancun">Cancún y generales</option>
              <option value="todas">Todas las ciudades</option>
            </select>
          </div>

          {avisos.status === 'error' && (
            <Notice tone="warn">No se pudieron cargar los avisos ({avisos.error}). {avisos.data ? 'Se muestran los últimos guardados.' : 'Revisa tu conexión e intenta «Actualizar».'}</Notice>
          )}
          {avisos.partialErrors && avisos.partialErrors.length > 0 && <Notice tone="warn">Una fuente no respondió: {avisos.partialErrors.join(' · ')}. Se muestran las demás.</Notice>}
          {avisos.status === 'loading' && !avisos.data && (
            <div className="card flex items-center gap-3 p-5 text-sm text-muted"><Loader2 size={18} className="animate-spin" /> Consultando aguakan.com y qroo.gob.mx…</div>
          )}
          {avisos.data && list.length === 0 && <div className="card p-5 text-sm text-muted">No hay avisos con estos filtros.</div>}

          <ul className="flex flex-col gap-3">
            {list.map((a) => {
              const t = AVISO_TYPES[a.type]
              const recent = Date.now() - Date.parse(avisoDate(a.date)) < 3 * 86400_000
              return (
                <li key={a.key} className="card flex flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold" style={{ background: t.tint, color: t.ink }}>
                      {a.type === 'corte' && <TriangleAlert size={12} aria-hidden="true" />}{t.label}
                    </span>
                    <span className="rounded-full border border-line px-2.5 py-1 font-semibold text-navy">{AVISO_SOURCES[a.source].short}</span>
                    <span className="rounded-full bg-bg px-2.5 py-1 font-semibold text-[#33506C]">{a.cityName}</span>
                    {recent && <span className="rounded-full bg-[#E3F1FC] px-2.5 py-1 font-semibold text-[#0C3159]">Reciente</span>}
                    <time className="ml-auto text-muted" dateTime={avisoDate(a.date)} title={fullDate(avisoDate(a.date))}>{relativeTime(avisoDate(a.date))}</time>
                  </div>
                  <h2 className="text-lg font-bold leading-snug">{a.title}</h2>
                  <p className="text-base leading-relaxed text-[#3D5873]">{a.excerpt}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.places.map((p) => (
                      <span key={p.name} className="inline-flex items-center gap-1 rounded-lg bg-soft px-2 py-1 text-sm font-medium text-[#0A4F87]"><MapPin size={12} aria-hidden="true" />{p.name}</span>
                    ))}
                    <a href={a.link} target="_blank" rel="noopener noreferrer" className="btn btn-ghost ml-auto !min-h-9 !px-2 text-sm">Ver aviso oficial <ExternalLink size={14} aria-hidden="true" /></a>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-[88px] xl:self-start">
          <RainCard />
          <WaterloggingDirectory />
          <section className="card overflow-hidden" aria-label="Mapa de avisos ubicados">
            <UrbiaMap className="h-[320px]" reports={[]} selectedId={null} onSelect={() => {}} cluster={false} showAvisosLegend extraLayer={<AvisosLayer avisos={located} />} />
            <p className="help px-4 py-3">{located.length} aviso(s) ubicados por las colonias o avenidas que mencionan. La ubicación es aproximada; consulta siempre el aviso oficial.</p>
          </section>
          <Notice>
            Fuentes: APIs públicas (WordPress REST) de aguakan.com (noticias) y qroo.gob.mx (comunicados de Cancún sobre calles, bacheo, drenaje pluvial e inundaciones){avisos.fetchedAt ? <>, consultadas {relativeTime(avisos.fetchedAt)}{avisos.fromCache ? ' (caché)' : ''}</> : null}. Los comunicados del Estado son de prensa: no son un registro completo de baches. URBIA no está afiliada a ninguna de las dos.
          </Notice>
        </aside>
      </div>
    </div>
  )
}
