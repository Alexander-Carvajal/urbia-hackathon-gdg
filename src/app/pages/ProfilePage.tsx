import { Download, FileText, Flag, Network, RotateCcw, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CategoryDot, Modal, Notice, PageHeader, StatusBadge } from '../../components/ui'
import { useToast } from '../../components/ui/Toast'
import { useReports } from '../../features/reports/store'
import { relativeTime } from '../../lib/format'
import { RewardsPanel } from '../../features/rewards/RewardsUI'
import type { Report } from '../../types'

interface InstallEvent extends Event { prompt: () => Promise<void> }

function List({ items, empty }: { items: Report[]; empty: string }) {
  if (!items.length) return <p className="help">{empty}</p>
  return (
    <ul className="flex flex-col gap-2">
      {items.map((r) => (
        <li key={r.id}><Link to={`/reportes/${r.id}`} className="flex items-center gap-3 rounded-xl border border-line p-3 hover:bg-bg">
          <CategoryDot category={r.category} size={34} />
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{r.title}</span><span className="text-xs text-muted">{relativeTime(r.createdAt)}</span></span>
          <StatusBadge status={r.status} />
        </Link></li>
      ))}
    </ul>
  )
}

export function ProfilePage() {
  const { reports, user, resetDemo, backend } = useReports()
  const toast = useToast()
  const [confirmReset, setConfirmReset] = useState(false)
  const [install, setInstall] = useState<InstallEvent | null>(null)
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setInstall(e as InstallEvent) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])
  const mine = reports.filter((r) => r.authorId === user.id)
  const corroborated = reports.filter((r) => r.confirmedBy.includes(user.id))
  const objected = reports.filter((r) => r.objections.some((o) => o.by === user.id))
  const initials = user.alias.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-8 md:py-7">
      <PageHeader title="Mi perfil" subtitle={backend.kind === 'local' ? 'Perfil de demostración guardado solo en este navegador.' : 'Perfil anónimo: tus aportes se comparten con la comunidad mediante Supabase.'} />
      <section className="card flex flex-wrap items-center gap-5 p-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-soft font-display text-xl font-extrabold text-primary-strong">{initials}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold">{user.alias}</h2>
          <p className="text-sm text-muted">Alias ficticio · identificador demo {user.id}</p>
        </div>
        <dl className="grid w-full grid-cols-3 gap-2 sm:w-auto">
          {[{ i: FileText, v: mine.length, l: 'Reportes' }, { i: ShieldCheck, v: corroborated.length, l: 'Corroboraciones' }, { i: Flag, v: objected.length, l: 'Objeciones' }].map((x) => (
            <div key={x.l} className="rounded-xl bg-bg px-4 py-3 text-center"><dt className="flex items-center justify-center gap-1 text-xs text-muted"><x.i size={13} aria-hidden="true" />{x.l}</dt><dd className="font-display text-2xl font-extrabold">{x.v}</dd></div>
          ))}
        </dl>
      </section>
      <RewardsPanel />
      <Notice>No publicamos datos privados: otras personas solo verían tu alias. Sin cuenta real ni inicio de sesión en este prototipo.</Notice>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card flex flex-col gap-3 p-5"><h2 className="text-base font-bold">Mis reportes</h2><List items={mine} empty="Aún no has creado reportes." />
          <Link to="/reportar" className="btn btn-primary self-start">Crear reporte</Link></section>
        <section className="card flex flex-col gap-3 p-5"><h2 className="text-base font-bold">Reportes que corroboré</h2><List items={corroborated} empty="Todavía no has corroborado reportes. Usa «Yo también lo observé» en un reporte." /></section>
      </div>
      <section className="card flex flex-wrap items-center gap-3 p-5">
        <Link to="/analisis" className="btn btn-secondary md:hidden"><Network size={17} aria-hidden="true" /> Análisis y conexiones</Link>
        <Link to="/datos" className="btn btn-secondary md:hidden"><FileText size={17} aria-hidden="true" /> Importar / exportar datos</Link>
        {install && <button type="button" className="btn btn-secondary" onClick={async () => { await install.prompt(); setInstall(null) }}><Download size={17} aria-hidden="true" /> Instalar URBIA</button>}
        {backend.kind === 'local'
          ? <button type="button" className="btn btn-secondary" onClick={() => setConfirmReset(true)}><RotateCcw size={17} aria-hidden="true" /> Restablecer datos de demostración</button>
          : <button type="button" className="btn btn-secondary" onClick={() => { resetDemo(); toast('Datos actualizados desde el servidor.') }}><RotateCcw size={17} aria-hidden="true" /> Actualizar datos</button>}
      </section>
      <Modal open={confirmReset} title="¿Restablecer la demostración?" onClose={() => setConfirmReset(false)}
        footer={<><button type="button" className="btn btn-secondary" onClick={() => setConfirmReset(false)}>Cancelar</button><button type="button" className="btn btn-primary" onClick={() => { resetDemo(); setConfirmReset(false); toast('Datos de demostración restablecidos.') }}>Restablecer</button></>}>
        <p className="text-sm text-[#3D5873]">Se borrarán los reportes que creaste, tus corroboraciones y objeciones guardadas en este navegador, y se cargarán de nuevo los datos ficticios iniciales.</p>
      </Modal>
    </div>
  )
}
