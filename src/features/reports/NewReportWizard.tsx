import { ArrowLeft, ArrowRight, Camera, Check, CircleCheck, LocateFixed, Loader2, MapPin, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PickMap } from '../../components/map/UrbiaMap'
import { CATEGORY_ICON, CategoryDot, CategoryTag, Notice, StatusBadge } from '../../components/ui'
import { useToast } from '../../components/ui/Toast'
import { CATEGORIES, CATEGORY_IDS } from '../../data/categories'
import { ZONES, zoneById } from '../../data/zones'
import { relativeTime } from '../../lib/format'
import { formatDistance, haversine, inCancunArea, nearestZone } from '../../lib/geo'
import { ACCEPTED_TYPES, MAX_PHOTO_MB, processPhoto } from '../../lib/image'
import { confirmationsOf, isActive } from '../../lib/rules'
import { clearDraft, loadDraft, saveDraft } from '../../lib/storage'
import type { CategoryId, Report } from '../../types'
import { useReports } from './store'

interface Draft {
  step: number
  category: CategoryId | ''
  title: string
  description: string
  zoneId: string
  reference: string
  point: { lat: number; lng: number } | null
  accuracyM: number
  pointSource: 'mapa' | 'gps' | 'zona' | ''
  photo: string | null
  noThirdParty: boolean
  rulesOk: boolean
}

const EMPTY: Draft = { step: 1, category: '', title: '', description: '', zoneId: '', reference: '', point: null, accuracyM: 150, pointSource: '', photo: null, noThirdParty: false, rulesOk: false }
const STEPS = ['¿Qué sucede?', '¿Dónde sucede?', 'Evidencia y revisión', 'Confirmar y publicar']
const DUP_RADIUS = 300

type Errors = Partial<Record<keyof Draft | 'form', string>>

function validate(d: Draft, step: number): Errors {
  const e: Errors = {}
  if (step === 1) {
    if (!d.category) e.category = 'Elige una categoría.'
    if (d.title.trim().length < 6) e.title = 'Escribe un título de al menos 6 caracteres.'
    if (d.title.trim().length > 80) e.title = 'Usa máximo 80 caracteres.'
    if (d.description.trim().length < 15) e.description = 'Describe lo que observaste (mínimo 15 caracteres).'
  }
  if (step === 2) {
    if (!d.point) e.point = 'Marca el punto aproximado en el mapa, usa tu ubicación o elige una zona.'
    else if (!inCancunArea(d.point.lat, d.point.lng)) e.point = 'El punto está fuera del área de Cancún que cubre esta demostración.'
    if (!d.zoneId) e.zoneId = 'Elige la zona general.'
  }
  if (step === 3) {
    if (!d.noThirdParty) e.noThirdParty = 'Confirma que el reporte no contiene datos personales de terceros.'
  }
  if (step === 4) {
    if (!d.rulesOk) e.rulesOk = 'Debes aceptar las reglas comunitarias para publicar.'
  }
  return e
}

function FieldError({ id, msg }: { id: string; msg?: string }) {
  return msg ? <p id={id} role="alert" className="mt-1.5 text-sm font-medium text-danger">{msg}</p> : null
}

export function NewReportWizard() {
  const { reports, addReport, confirm, user } = useReports()
  const toast = useToast()
  const nav = useNavigate()
  const [d, setD] = useState<Draft>(() => ({ ...EMPTY, ...(loadDraft<Draft>() ?? {}) }))
  const [errors, setErrors] = useState<Errors>({})
  const [published, setPublished] = useState<Report | null>(null)
  const [locating, setLocating] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const restored = useRef(!!loadDraft<Draft>())

  useEffect(() => { if (!published) saveDraft(d) }, [d, published])
  useEffect(() => { headingRef.current?.focus() }, [d.step, published])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setD((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })) }

  const next = () => {
    const e = validate(d, d.step)
    setErrors(e)
    if (Object.keys(e).length) { document.getElementById(`f-${Object.keys(e)[0]}`)?.focus(); return }
    setD((s) => ({ ...s, step: Math.min(4, s.step + 1) }))
    window.scrollTo({ top: 0 })
  }
  const back = () => { setErrors({}); setD((s) => ({ ...s, step: Math.max(1, s.step - 1) })); window.scrollTo({ top: 0 }) }

  const pickPoint = (p: { lat: number; lng: number }, source: Draft['pointSource'], acc = 50) => {
    setD((s) => ({ ...s, point: p, pointSource: source, accuracyM: Math.round(acc), zoneId: source === 'zona' ? s.zoneId : nearestZone(p.lat, p.lng).id }))
    setErrors((e) => ({ ...e, point: undefined, zoneId: undefined }))
  }

  const useGps = () => {
    if (!('geolocation' in navigator)) { toast('Tu navegador no permite geolocalización. Marca el punto en el mapa.', 'warn'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); pickPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 'gps', pos.coords.accuracy) },
      (err) => { setLocating(false); toast(err.code === 1 ? 'Permiso de ubicación denegado. Marca el punto en el mapa.' : 'No se pudo obtener tu ubicación.', 'warn') },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const onZone = (id: string) => {
    set('zoneId', id)
    const z = zoneById(id)
    if (z && !d.point) { setD((s) => ({ ...s, zoneId: id, point: { lat: z.lat, lng: z.lng }, pointSource: 'zona', accuracyM: 400 })) }
  }

  const onPhoto = async (f: File | undefined) => {
    if (!f) return
    setPhotoBusy(true)
    try { set('photo', await processPhoto(f)); setErrors((e) => ({ ...e, photo: undefined })) }
    catch (err) { setErrors((e) => ({ ...e, photo: (err as Error).message })) }
    finally { setPhotoBusy(false) }
  }

  const similar = useMemo(() => !d.point || !d.category ? [] : reports
    .filter((r) => isActive(r) && r.category === d.category && haversine(r.lat, r.lng, d.point!.lat, d.point!.lng) <= DUP_RADIUS)
    .map((r) => ({ r, dist: haversine(r.lat, r.lng, d.point!.lat, d.point!.lng) }))
    .sort((a, b) => a.dist - b.dist).slice(0, 3), [reports, d.point, d.category])

  const corroborateExisting = (r: Report) => {
    const res = confirm(r.id)
    clearDraft()
    if (res === 'ok') toast('Corroboraste el reporte existente. ¡Gracias por evitar duplicados!')
    else if (res === 'own') toast('Ese reporte es tuyo; no puedes corroborarlo.', 'info')
    else if (res === 'already') toast('Ya habías corroborado ese reporte.', 'info')
    nav(`/reportes/${r.id}`)
  }

  const publish = () => {
    const e = validate(d, 4)
    setErrors(e)
    if (Object.keys(e).length || !d.category || !d.point) return
    const r = addReport({ category: d.category, title: d.title, description: d.description, zoneId: d.zoneId, reference: d.reference, lat: d.point.lat, lng: d.point.lng, accuracyM: d.accuracyM, photo: d.photo })
    clearDraft()
    setPublished(r)
  }

  const restart = () => { clearDraft(); setD(EMPTY); setPublished(null); setErrors({}) }

  if (published) {
    return (
      <div className="card mx-auto flex w-full max-w-xl flex-col items-center gap-4 p-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-soft"><CircleCheck size={34} className="text-primary-strong" aria-hidden="true" /></span>
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold">Reporte publicado</h1>
        <p className="text-[15px] text-[#3D5873]">«{published.title}» ya aparece en el mapa y en el listado con estado:</p>
        <StatusBadge status="pendiente" long />
        <p className="help max-w-md">Se guardó en este navegador (ID {published.id}). Otras personas podrán corroborarlo. <strong>No se envió a ninguna autoridad:</strong> este prototipo no tiene esa integración.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link to={`/mapa?sel=${published.id}`} className="btn btn-primary"><MapPin size={17} aria-hidden="true" /> Ver en el mapa</Link>
          <Link to={`/reportes/${published.id}`} className="btn btn-secondary">Ver detalle</Link>
          <button type="button" className="btn btn-ghost" onClick={restart}>Crear otro</button>
        </div>
      </div>
    )
  }

  const zone = zoneById(d.zoneId)
  const cat = d.category ? CATEGORIES[d.category] : null

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <ol aria-label="Progreso del reporte" className="grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => {
          const n = i + 1, done = n < d.step, cur = n === d.step
          return (
            <li key={s} aria-current={cur ? 'step' : undefined} className="flex flex-col gap-1.5">
              <span className={`h-1.5 rounded-full ${done || cur ? 'bg-primary' : 'bg-line'}`} />
              <span className={`flex items-center gap-1.5 text-xs font-semibold ${cur ? 'text-primary-strong' : done ? 'text-navy' : 'text-muted'}`}>
                {done ? <Check size={13} aria-hidden="true" /> : <span aria-hidden="true">{n}.</span>}<span className={cur ? '' : 'hidden sm:inline'}>{s}</span>
                <span className="sr-only">{done ? '(completado)' : cur ? '(paso actual)' : '(pendiente)'}</span>
              </span>
            </li>
          )
        })}
      </ol>

      {restored.current && d.step === 1 && (d.title || d.category) && (
        <Notice>Recuperamos un borrador guardado en este navegador. <button type="button" className="font-semibold underline" onClick={restart}>Empezar de cero</button></Notice>
      )}

      <section className="card flex flex-col gap-5 p-5 md:p-7" aria-labelledby="step-title">
        <h1 id="step-title" ref={headingRef} tabIndex={-1} className="text-[22px] font-extrabold">Paso {d.step} de 4 · {STEPS[d.step - 1]}</h1>

        {d.step === 1 && (
          <>
            <fieldset>
              <legend className="label mb-2">Categoría</legend>
              <div id="f-category" tabIndex={-1} className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-describedby={errors.category ? 'e-category' : undefined}>
                {CATEGORY_IDS.map((c) => {
                  const I = CATEGORY_ICON[c]; const on = d.category === c
                  return (
                    <button key={c} type="button" role="radio" aria-checked={on} onClick={() => set('category', c)}
                      className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 p-3 text-left text-sm font-semibold transition-colors ${on ? 'bg-soft' : 'border-line bg-white hover:border-[#B7D6EE]'}`} style={on ? { borderColor: CATEGORIES[c].color } : undefined}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: CATEGORIES[c].color }}><I size={20} color="#fff" aria-hidden="true" /></span>
                      {CATEGORIES[c].label}
                    </button>
                  )
                })}
              </div>
              <FieldError id="e-category" msg={errors.category} />
            </fieldset>
            <div>
              <label htmlFor="f-title" className="label">Título breve</label>
              <input id="f-title" className="input mt-2" maxLength={80} value={d.title} onChange={(e) => set('title', e.target.value)} aria-invalid={!!errors.title} aria-describedby="h-title e-title" placeholder="Ej. Bache profundo frente a la escuela" />
              <p id="h-title" className="help mt-1">{d.title.length}/80 caracteres</p>
              <FieldError id="e-title" msg={errors.title} />
            </div>
            <div>
              <label htmlFor="f-description" className="label">Descripción</label>
              <textarea id="f-description" rows={4} maxLength={600} className="input mt-2" value={d.description} onChange={(e) => set('description', e.target.value)} aria-invalid={!!errors.description} aria-describedby="h-desc e-description" placeholder="¿Qué observaste, desde cuándo y cómo afecta a la zona?" />
              <p id="h-desc" className="help mt-1">{cat ? cat.example : 'Elige una categoría para ver un ejemplo.'}</p>
              <FieldError id="e-description" msg={errors.description} />
            </div>
          </>
        )}

        {d.step === 2 && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="f-zoneId" className="label">Zona general</label>
                <select id="f-zoneId" className="input mt-2" value={d.zoneId} onChange={(e) => onZone(e.target.value)} aria-invalid={!!errors.zoneId} aria-describedby="e-zoneId">
                  <option value="">Selecciona una zona…</option>
                  {ZONES.map((z) => <option key={z.id} value={z.id}>{z.name} · {z.hint}</option>)}
                </select>
                <FieldError id="e-zoneId" msg={errors.zoneId} />
              </div>
              <div>
                <label htmlFor="f-reference" className="label">Referencia <span className="font-normal text-muted">(opcional)</span></label>
                <input id="f-reference" className="input mt-2" maxLength={120} value={d.reference} onChange={(e) => set('reference', e.target.value)} placeholder="Ej. frente al parque, esquina con…" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="label" id="map-label">Punto aproximado en el mapa</span>
                <button type="button" className="btn btn-secondary !min-h-10" onClick={useGps} disabled={locating}>
                  {locating ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <LocateFixed size={16} aria-hidden="true" />} Usar mi ubicación
                </button>
              </div>
              <p className="help mt-1">Toca el mapa para colocar el pin y arrástralo para ajustarlo. Solo pedimos tu ubicación si presionas el botón.</p>
              <div id="f-point" tabIndex={-1} aria-labelledby="map-label"><PickMap className="mt-2 h-[300px] md:h-[340px]" value={d.point} onChange={(p) => pickPoint(p, 'mapa', 50)} /></div>
              <FieldError id="e-point" msg={errors.point} />
              {d.point && (
                <p className="mt-2 text-sm text-[#3D5873]">
                  <strong className="text-navy">{zone?.name ?? 'Zona'}</strong> · precisión aproximada ±{d.accuracyM} m
                  {d.pointSource === 'zona' && ' (centro ilustrativo de la zona; ajústalo si puedes)'}
                  {d.pointSource === 'gps' && ' (según tu dispositivo)'}
                </p>
              )}
            </div>
          </>
        )}

        {d.step === 3 && (
          <>
            <div>
              <span className="label">Fotografía <span className="font-normal text-muted">(opcional)</span></span>
              {d.photo ? (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <img src={d.photo} alt="Vista previa de la foto adjunta" className="h-48 w-full rounded-xl object-cover sm:w-72" />
                  <button type="button" className="btn btn-secondary" onClick={() => set('photo', null)}><Trash2 size={16} aria-hidden="true" /> Quitar foto</button>
                </div>
              ) : (
                <label htmlFor="f-photo" className="mt-2 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[#B7D6EE] bg-bg px-4 py-8 text-center hover:bg-soft">
                  {photoBusy ? <Loader2 size={24} className="animate-spin text-primary" aria-hidden="true" /> : <Upload size={24} className="text-primary" aria-hidden="true" />}
                  <span className="text-sm font-semibold">Elegir o tomar una foto</span>
                  <span className="help">JPG, PNG o WebP · máximo {MAX_PHOTO_MB} MB. Quitamos los metadatos (incluida la ubicación GPS) al procesarla.</span>
                </label>
              )}
              <input id="f-photo" type="file" accept={ACCEPTED_TYPES.join(',')} capture="environment" className="sr-only" onChange={(e) => { onPhoto(e.target.files?.[0]); e.target.value = '' }} />
              <FieldError id="e-photo" msg={errors.photo} />
            </div>

            <div>
              <h2 className="label mb-2">Reportes similares cercanos</h2>
              {similar.length === 0
                ? <p className="help flex items-center gap-2"><Check size={15} className="text-primary" aria-hidden="true" />No encontramos reportes activos de esta categoría a menos de {DUP_RADIUS} m.</p>
                : (
                  <ul className="flex flex-col gap-2">
                    {similar.map(({ r, dist }) => (
                      <li key={r.id} className="flex flex-col gap-3 rounded-2xl border border-line p-3 sm:flex-row sm:items-center">
                        <CategoryDot category={r.category} />
                        <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{r.title}</p><p className="text-xs text-muted">A {formatDistance(dist)} · {relativeTime(r.createdAt)} · {confirmationsOf(r)} confirmaciones</p></div>
                        {r.authorId !== user.id && <button type="button" className="btn btn-secondary !min-h-10 text-[13px]" onClick={() => corroborateExisting(r)}><ShieldCheck size={16} aria-hidden="true" /> Ya existe este reporte: corroborarlo</button>}
                      </li>
                    ))}
                  </ul>
                )}
            </div>

            <label className="flex items-start gap-3 rounded-xl bg-bg p-3 text-sm">
              <input id="f-noThirdParty" type="checkbox" className="mt-0.5 h-5 w-5 accent-[#0670C4]" checked={d.noThirdParty} onChange={(e) => set('noThirdParty', e.target.checked)} aria-describedby="e-noThirdParty" />
              <span>Confirmo que el texto y la foto <strong>no contienen datos personales de terceros</strong> (rostros, placas, nombres o teléfonos).</span>
            </label>
            <FieldError id="e-noThirdParty" msg={errors.noThirdParty} />
          </>
        )}

        {d.step === 4 && d.category && (
          <>
            <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
              <div className="flex flex-wrap items-center gap-2"><CategoryTag category={d.category} /><StatusBadge status="pendiente" /></div>
              <p className="text-lg font-bold">{d.title}</p>
              <p className="text-sm leading-relaxed text-[#3D5873]">{d.description}</p>
              <p className="flex items-center gap-1.5 text-sm text-muted"><MapPin size={15} aria-hidden="true" />{zone?.name}{d.reference ? ` · ${d.reference}` : ''} · ±{d.accuracyM} m</p>
              <p className="flex items-center gap-1.5 text-sm text-muted"><Camera size={15} aria-hidden="true" />{d.photo ? '1 fotografía sin metadatos' : 'Sin fotografía'}</p>
              <p className="text-xs text-muted">Autor: {user.alias} (alias demo) · Fuente: Ciudadanía</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-ghost !min-h-9 !px-2 text-sm" onClick={() => setD((s) => ({ ...s, step: 1 }))}>Editar descripción</button>
                <button type="button" className="btn btn-ghost !min-h-9 !px-2 text-sm" onClick={() => setD((s) => ({ ...s, step: 2 }))}>Editar ubicación</button>
              </div>
            </div>
            <Notice>Se publicará como <strong>Pendiente</strong>. Pasará a revisión o a corroborado solo si otras personas lo confirman. No se envía a ninguna autoridad.</Notice>
            <label className="flex items-start gap-3 rounded-xl bg-bg p-3 text-sm">
              <input id="f-rulesOk" type="checkbox" className="mt-0.5 h-5 w-5 accent-[#0670C4]" checked={d.rulesOk} onChange={(e) => set('rulesOk', e.target.checked)} aria-describedby="e-rulesOk" />
              <span>Acepto las reglas comunitarias: reportar de buena fe, sin insultos ni datos personales, y entiendo que la información puede ser revisada por la comunidad.</span>
            </label>
            <FieldError id="e-rulesOk" msg={errors.rulesOk} />
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          {d.step > 1 ? <button type="button" className="btn btn-secondary" onClick={back}><ArrowLeft size={17} aria-hidden="true" /> Anterior</button> : <Link to="/" className="btn btn-ghost">Cancelar</Link>}
          {d.step < 4
            ? <button type="button" className="btn btn-primary" onClick={next}>Siguiente <ArrowRight size={17} aria-hidden="true" /></button>
            : <button type="button" className="btn btn-primary" onClick={publish}>Publicar reporte</button>}
        </div>
      </section>
      <p className="text-center text-xs text-muted">El borrador se guarda automáticamente en este navegador.</p>
    </div>
  )
}
