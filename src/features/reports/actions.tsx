import { ShieldCheck, ThumbsUp, Flag } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useToast } from '../../components/ui/Toast'
import { Modal } from '../../components/ui'
import { accessUrl } from '../auth/demoSession'
import type { ObjectionReason, Report } from '../../types'
import { reportStatus } from '../../lib/rules'
import { useReports } from './store'

/** Estado del botón «Yo también lo observé» para el usuario demo actual. */
export function useCorroboration(report: Report | undefined) {
  const { confirm, user, hasConfirmed, demoProfile } = useReports()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const own = !!demoProfile && !!report && report.authorId === user.id
  const done = !!demoProfile && !!report && hasConfirmed(report)
  const closed = !!report && (reportStatus(report) === 'resuelto' || reportStatus(report) === 'descartado')
  const reason = closed ? 'Este reporte ya está cerrado.' : !demoProfile ? 'Inicia sesión para corroborar.' : own ? 'No puedes corroborar tu propio reporte.' : done ? 'Ya registraste tu confirmación en este navegador.' : ''
  const run = () => {
    if (!report) return
    if (!demoProfile) { navigate(accessUrl(location.pathname + location.search)); return }
    const res = confirm(report.id)
    if (res === 'ok') toast('Gracias. Registramos tu confirmación (validación comunitaria).')
    else if (res === 'already') toast('Ya habías corroborado este reporte.', 'info')
    else if (res === 'own') toast('No puedes corroborar tu propio reporte.', 'warn')
    else if (res === 'closed') toast('Este reporte está cerrado y ya no recibe confirmaciones.', 'info')
  }
  return { own, done, closed, disabled: own || done || closed, reason, run }
}

export function CorroborateButton({ report, full = false, compact = false }: { report: Report; full?: boolean; compact?: boolean }) {
  const c = useCorroboration(report)
  return (
    <div className={`flex flex-col gap-1.5 ${full ? 'w-full' : ''}`}>
      <button type="button" className={`btn ${c.done ? 'btn-secondary' : 'btn-primary'} ${full ? 'w-full' : ''}`} onClick={c.run} disabled={c.disabled} aria-describedby={c.reason ? `why-${report.id}` : undefined}>
        {c.done ? <ShieldCheck size={18} aria-hidden="true" /> : <ThumbsUp size={18} aria-hidden="true" />}
        {c.done ? 'Ya lo corroboraste' : compact ? 'Corroborar' : 'Yo también lo observé'}
      </button>
      {c.reason && <span id={`why-${report.id}`} className="text-xs text-muted">{c.reason}</span>}
    </div>
  )
}

const REASONS: { id: ObjectionReason; label: string }[] = [
  { id: 'no-existe', label: 'No existe o no lo encontré en el lugar' },
  { id: 'ubicacion', label: 'La ubicación es incorrecta' },
  { id: 'duplicado', label: 'Es un duplicado de otro reporte' },
  { id: 'resuelto', label: 'Ya no está o fue atendido' },
  { id: 'otro', label: 'Otro motivo' },
]

export function ObjectionButton({ report }: { report: Report }) {
  const { object, hasObjected, user, demoProfile } = useReports()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ObjectionReason | ''>('')
  const [detail, setDetail] = useState('')
  const [err, setErr] = useState('')
  const already = !!demoProfile && hasObjected(report)
  const own = !!demoProfile && report.authorId === user.id
  const submit = () => {
    if (!demoProfile) { setOpen(false); navigate(accessUrl(location.pathname + location.search)); return }
    if (!reason) { setErr('Selecciona un motivo.'); return }
    if (reason === 'otro' && detail.trim().length < 5) { setErr('Describe brevemente el motivo (mínimo 5 caracteres).'); return }
    if (object(report.id, reason, detail)) {
      toast('Objeción registrada. El reporte no se borra: queda para revisión comunitaria.')
      setOpen(false); setReason(''); setDetail(''); setErr('')
    }
  }
  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={() => demoProfile ? setOpen(true) : navigate(accessUrl(location.pathname + location.search))} disabled={already || own}>
        <Flag size={17} aria-hidden="true" /> {already ? 'Objeción enviada' : 'Información incorrecta'}
      </button>
      <Modal open={open} title="Información incorrecta" onClose={() => setOpen(false)}
        footer={<><button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit}>Enviar objeción</button></>}>
        <p className="help mb-4">Tu observación se añade al historial. Si dos vecinos indican que la incidencia ya no está desde la última observación, se marca como resuelta.</p>
        <fieldset className="flex flex-col gap-2">
          <legend className="label mb-2">Motivo</legend>
          {REASONS.map((r) => (
            <label key={r.id} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm ${reason === r.id ? 'border-primary bg-soft' : 'border-line'}`}>
              <input type="radio" name="reason" value={r.id} checked={reason === r.id} onChange={() => { setReason(r.id); setErr('') }} className="h-4 w-4 accent-[#0670C4]" />
              {r.label}
            </label>
          ))}
        </fieldset>
        <label className="label mt-4 block" htmlFor="obj-detail">Detalle {reason === 'otro' ? '(obligatorio)' : '(opcional)'}</label>
        <textarea id="obj-detail" className="input mt-2" rows={3} maxLength={300} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Ej. Pasé esta mañana y el bache ya estaba tapado." />
        {err && <p role="alert" className="mt-2 text-sm font-medium text-danger">{err}</p>}
      </Modal>
    </>
  )
}
