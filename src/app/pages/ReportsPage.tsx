import { Camera, MapPin, Search, SearchX, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CategoryDot, EmptyState, PageHeader, StatusBadge } from '../../components/ui'
import { CATEGORIES, CATEGORY_IDS, STATUSES, STATUS_ORDER } from '../../data/categories'
import { zoneById } from '../../data/zones'
import { useReports } from '../../features/reports/store'
import { relativeTime } from '../../lib/format'
import { norm } from '../../lib/geo'
import { confirmationsOf, evidenceOf } from '../../lib/rules'
import type { CategoryId, Status } from '../../types'

export function ReportsPage() {
  const { reports, user } = useReports()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'todos' | Status>('todos')
  const [cat, setCat] = useState<'todos' | CategoryId>('todos')
  const [sort, setSort] = useState<'recientes' | 'confirmaciones'>('recientes')

  const searched = useMemo(() => {
    const nq = norm(q)
    return reports.filter((r) => (cat === 'todos' || r.category === cat) && (!nq || norm(`${r.title} ${r.description} ${r.reference} ${zoneById(r.zoneId)?.name ?? ''}`).includes(nq)))
  }, [reports, q, cat])
  const list = useMemo(() => {
    const l = status === 'todos' ? searched : searched.filter((r) => r.status === status)
    return [...l].sort((a, b) => sort === 'recientes' ? b.createdAt.localeCompare(a.createdAt) : confirmationsOf(b) - confirmationsOf(a))
  }, [searched, status, sort])

  const tabs: ('todos' | Status)[] = ['todos', ...STATUS_ORDER]
  const plurals: Record<string, string> = { todos: 'Todos', pendiente: 'Pendientes', revision: 'En revisión', corroborado: 'Corroborados', resuelto: 'Resueltos', descartado: 'Descartados' }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-8 md:py-7">
      <PageHeader title="Reportes" subtitle="Observaciones ciudadanas de Cancún. La corroboración es comunitaria, no oficial." actions={<Link to="/reportar" className="btn btn-primary hidden md:inline-flex">Crear reporte</Link>} />

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-[1_1_260px]">
          <label htmlFor="rep-search" className="sr-only">Buscar reportes</label>
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input id="rep-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} className="input !pl-10" placeholder="Buscar por título, zona o referencia" />
        </div>
        <label htmlFor="rep-cat" className="sr-only">Categoría</label>
        <select id="rep-cat" className="input !w-auto" value={cat} onChange={(e) => setCat(e.target.value as 'todos' | CategoryId)}>
          <option value="todos">Todas las categorías</option>
          {CATEGORY_IDS.map((c) => <option key={c} value={c}>{CATEGORIES[c].label}</option>)}
        </select>
        <label htmlFor="rep-sort" className="sr-only">Ordenar</label>
        <select id="rep-sort" className="input !w-auto" value={sort} onChange={(e) => setSort(e.target.value as 'recientes' | 'confirmaciones')}>
          <option value="recientes">Más recientes</option>
          <option value="confirmaciones">Más confirmaciones</option>
        </select>
      </div>

      <div role="group" aria-label="Filtrar por estado" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {tabs.map((t) => (
          <button key={t} type="button" className="chip" aria-pressed={status === t} onClick={() => setStatus(t)}>
            {plurals[t]} <span className="opacity-70">{t === 'todos' ? searched.length : searched.filter((r) => r.status === t).length}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card"><EmptyState icon={SearchX} title="No se encontraron reportes" action={<button type="button" className="btn btn-secondary" onClick={() => { setQ(''); setStatus('todos'); setCat('todos') }}>Limpiar filtros</button>}>Prueba con otra búsqueda o cambia los filtros de estado y categoría.</EmptyState></div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2" aria-label={`${list.length} reportes`}>
          {list.map((r) => (
            <li key={r.id}>
              <Link to={`/reportes/${r.id}`} className="card flex h-full gap-3.5 p-4 transition-shadow hover:shadow-[var(--shadow-float)]">
                <CategoryDot category={r.category} size={44} />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-[15px] font-bold leading-snug">{r.title}</h2>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="line-clamp-2 text-[13px] leading-relaxed text-[#3D5873]">{r.description}</p>
                  <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted">
                    <span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden="true" />{zoneById(r.zoneId)?.name} · aprox.</span>
                    <span>{CATEGORIES[r.category].label}</span>
                    <span>{relativeTime(r.createdAt)}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-navy"><Users size={13} aria-hidden="true" />{confirmationsOf(r)}</span>
                    {evidenceOf(r) > 0 && <span className="inline-flex items-center gap-1"><Camera size={13} aria-hidden="true" />{evidenceOf(r)}</span>}
                    {r.authorId === user.id && <span className="font-semibold text-primary-strong">Tu reporte</span>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">Estados: {STATUS_ORDER.map((s) => STATUSES[s].long).join(' · ')}.</p>
    </div>
  )
}

