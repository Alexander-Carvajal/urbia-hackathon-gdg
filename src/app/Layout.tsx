import { BarChart3, Bell, Check, ChevronDown, Cloud, CloudOff, Database, Droplets, FileText, House, Loader2, Map as MapIcon, MapPin, Menu, Plus, RefreshCw, Search, ShieldCheck, User, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Logo, SidebarArt } from '../components/brand/Brand'
import { useReports } from '../features/reports/store'
import { RewardWatcher } from '../features/rewards/RewardsUI'
import { relativeTime } from '../lib/format'

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open, close])
  return ref
}

function Notifications() {
  const { reports, user } = useReports()
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState<string[]>([])
  const ref = useOutside(open, () => setOpen(false))
  const items = useMemo(() => {
    const mine = reports.filter((r) => r.authorId === user.id).map((r) => ({ id: 'm' + r.id + r.history.length, to: `/reportes/${r.id}`, text: `Tu reporte «${r.title}» está ${r.status === 'pendiente' ? 'pendiente de confirmaciones' : 'en estado ' + r.status}`, at: r.history[r.history.length - 1].at }))
    const recent = [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4).map((r) => ({ id: 'n' + r.id, to: `/reportes/${r.id}`, text: `Nuevo reporte cerca: ${r.title}`, at: r.createdAt }))
    return [...mine, ...recent].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5)
  }, [reports, user.id])
  const unread = items.filter((i) => !seen.includes(i.id)).length
  return (
    <div className="relative" ref={ref}>
      <button type="button" className="relative flex h-11 w-11 items-center justify-center rounded-full text-navy hover:bg-soft" aria-label={`Notificaciones, ${unread} sin leer`} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Bell size={21} />
        {unread > 0 && <span className="absolute right-2.5 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#E5484D]" aria-hidden="true" />}
      </button>
      {open && (
        <div className="animate-fade absolute right-0 top-12 z-[1500] w-[min(340px,calc(100vw-24px))] rounded-2xl border border-line bg-white p-2 shadow-[var(--shadow-float)]">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm font-bold">Notificaciones</span>
            <button type="button" className="rounded-lg px-2 py-1 text-xs font-semibold text-primary-strong hover:bg-soft" onClick={() => setSeen(items.map((i) => i.id))}>Marcar como leídas</button>
          </div>
          <ul className="flex flex-col">
            {items.map((i) => (
              <li key={i.id}>
                <Link to={i.to} onClick={() => { setOpen(false); setSeen((s) => [...s, i.id]) }} className="flex gap-2.5 rounded-xl px-2 py-2.5 hover:bg-bg">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${seen.includes(i.id) ? 'bg-transparent' : 'bg-primary'}`} aria-hidden="true" />
                  <span className="flex flex-col gap-0.5"><span className="text-[13px] leading-snug">{i.text}</span><span className="text-xs text-muted">{relativeTime(i.at)}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function CitySelector() {
  const [open, setOpen] = useState(false)
  const ref = useOutside(open, () => setOpen(false))
  return (
    <div className="city-location relative ml-auto hidden xl:block" ref={ref}>
      <button type="button" className="flex h-12 items-center gap-2.5 whitespace-nowrap rounded-xl border border-line bg-white px-4 text-[15px] font-medium hover:bg-soft" aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen((v) => !v)}>
        <MapPin size={18} className="text-primary" aria-hidden="true" /> Cancún, Q. Roo <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <ul role="listbox" aria-label="Ciudad" className="animate-fade absolute left-0 top-14 z-[1500] w-64 rounded-2xl border border-line bg-white p-2 shadow-[var(--shadow-float)]">
          <li role="option" aria-selected="true" className="flex items-center justify-between rounded-xl bg-soft px-3 py-2.5 text-sm font-semibold">Cancún, Q. Roo <Check size={16} className="text-primary-strong" /></li>
          <li role="option" aria-selected="false" aria-disabled="true" className="px-3 py-2.5 text-sm text-muted">Otras ciudades: próximamente</li>
        </ul>
      )}
    </div>
  )
}

export function SearchBox({ autoFocus = false, onDone, placeholder = 'Buscar región, calle o nombre…', id = 'global-search' }: { autoFocus?: boolean; onDone?: () => void; placeholder?: string; id?: string }) {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!q.trim()) return
    nav(`/mapa?q=${encodeURIComponent(q.trim())}`)
    setQ(''); onDone?.()
  }
  return (
    <form role="search" onSubmit={submit} className="relative w-full">
      <label htmlFor={id} className="sr-only">Buscar colonia, zona o referencia</label>
      <button type="submit" aria-label="Buscar en el mapa" className="absolute inset-y-0 left-0 grid w-11 place-items-center text-primary-strong"><Search size={18} /></button>
      <input id={id} autoFocus={autoFocus} value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder={placeholder} className="input !min-h-12 !rounded-full !border-line !bg-bg !pl-11" />
    </form>
  )
}

function SyncStatus() {
  const { backend, reload } = useReports()
  if (backend.kind === 'local') return null
  if (backend.status === 'connecting') return <span className="hidden items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-muted xl:flex"><Loader2 size={14} className="animate-spin" aria-hidden="true" />Conectando…</span>
  if (backend.status === 'online') return <span className="pill hidden bg-[#E8F7EE] text-[#17663A] xl:inline-flex" title="Datos compartidos en Supabase, actualizados en tiempo real"><Cloud size={14} aria-hidden="true" />En línea</span>
  return <button type="button" onClick={reload} className="pill bg-[#FDECEC] text-[#9B1C1C]" title={backend.error}><CloudOff size={14} aria-hidden="true" />Sin conexión <RefreshCw size={12} aria-hidden="true" /></button>
}

const MAIN_NAV = [
  { to: '/', label: 'Inicio', icon: House },
  { to: '/mapa', label: 'Mapa de incidencias', icon: MapIcon },
  { to: '/reportes', label: 'Reportes ciudadanos', icon: FileText },
  { to: '/analisis', label: 'Conexiones urbanas', icon: BarChart3 },
]
const ENVIRONMENT_NAV = [
  { to: '/avisos', label: 'Avisos y clima', icon: Droplets },
  { to: '/datos', label: 'Datos abiertos', icon: Database },
]

function NavItems({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const [environmentOpen, setEnvironmentOpen] = useState(true)
  const item = ({ to, label, icon: Icon }: typeof MAIN_NAV[number]) => (
    <NavLink key={to} to={to} end={to === '/'} title={collapsed ? label : undefined} onClick={onNavigate}
      className={({ isActive }) => `city-nav-item ${isActive ? 'is-active' : ''} ${collapsed ? 'justify-center' : ''}`}>
      <Icon size={19} aria-hidden="true" /><span className={collapsed ? 'sr-only' : undefined}>{label}</span>
    </NavLink>
  )
  return (
    <>
      {MAIN_NAV.map(item)}
      <div className="city-nav-section">
        {!collapsed && <button className="city-environment-toggle" aria-expanded={environmentOpen} onClick={() => setEnvironmentOpen(!environmentOpen)}>
          Entorno <ChevronDown size={15} className={environmentOpen ? '' : '-rotate-90'} />
        </button>}
        {(collapsed || environmentOpen) && ENVIRONMENT_NAV.map(item)}
      </div>
      <div className="city-nav-section">{item({ to: '/perfil', label: 'Mi cuenta', icon: User })}</div>
    </>
  )
}

function CitizenNote() {
  return (
    <div className="relative z-10 rounded-xl border border-white/15 bg-white/5 p-3">
      <p className="flex items-center gap-2 text-[13px] font-bold text-white"><ShieldCheck size={18} className="text-primary" aria-hidden="true" />Plataforma ciudadana</p>
      <p className="mt-1 text-xs leading-snug text-sky-100">Datos de demostración. No es un sistema oficial de atención ni información en tiempo real.</p>
    </div>
  )
}

function SideNav() {
  const [pinned, setPinned] = useState(() => window.matchMedia('(min-width: 1191px)').matches)
  const [hovered, setHovered] = useState(false)
  const [keyboardFocus, setKeyboardFocus] = useState(false)
  const expanded = pinned || hovered || keyboardFocus

  return (
    <nav aria-label="Navegación principal"
      className={`city-sidebar desktop-sidebar sticky top-0 hidden h-dvh shrink-0 flex-col md:flex ${expanded ? 'w-[240px]' : 'w-[72px]'}`}
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true) }}
      onPointerLeave={() => setHovered(false)}
      onFocus={(event) => { if (event.target.matches(':focus-visible')) setKeyboardFocus(true) }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocus(false) }}>
      <div className="city-brand-row"><Logo compact={!expanded} onDark /></div>
      <button type="button" className="sidebar-pin" aria-pressed={pinned} aria-label={pinned ? 'Liberar menú lateral' : 'Fijar menú lateral'}
        title={pinned ? 'Liberar menú lateral' : 'Fijar menú lateral'} onClick={() => { setPinned(!pinned); setHovered(false); setKeyboardFocus(false) }}>
        <Menu size={16} strokeWidth={1.7} aria-hidden="true" />
      </button>
      <NavItems collapsed={!expanded} />
      <div className="mt-auto pt-4">{expanded && <CitizenNote />}</div>
      <SidebarArt />
    </nav>
  )
}

/** Menú lateral en móvil (botón hamburguesa). */
function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return
    dialog.showModal()
    const desktop = window.matchMedia('(min-width: 48rem)')
    const closeOnDesktop = () => { if (desktop.matches) dialog.close() }
    desktop.addEventListener('change', closeOnDesktop)
    return () => {
      desktop.removeEventListener('change', closeOnDesktop)
      if (dialog.open) dialog.close()
    }
  }, [open])
  if (!open) return null
  return (
    <dialog ref={ref} className="mobile-menu" id="mobile-menu" aria-label="Menú" onClose={onClose}
      onClick={(event) => { if (event.target === ref.current) onClose() }}>
      <div className="animate-slide city-sidebar relative flex h-full flex-col gap-1.5">
        <div className="mb-3 flex items-center justify-between">
          <Logo onDark />
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl text-white hover:bg-white/10" aria-label="Cerrar menú" onClick={onClose}><X size={20} /></button>
        </div>
        <NavItems onNavigate={onClose} />
        <div className="mt-auto"><CitizenNote /></div>
        <SidebarArt />
      </div>
    </dialog>
  )
}

function BottomNav() {
  const { pathname } = useLocation()
  const item = (active: boolean) => `flex min-h-[60px] flex-1 flex-col items-center justify-center gap-0.5 text-[12px] font-semibold ${active ? 'text-primary-strong' : 'text-[#4D6780]'}`
  const tabs = [
    { to: '/', label: 'Inicio', icon: House, active: pathname === '/' },
    { to: '/mapa', label: 'Mapa', icon: MapIcon, active: pathname.startsWith('/mapa') },
    { to: '/reportes', label: 'Reportes', icon: FileText, active: pathname.startsWith('/reportes') },
    { to: '/perfil', label: 'Perfil', icon: User, active: pathname.startsWith('/perfil') },
  ]
  return (
    <>
      {pathname !== '/reportar' && (
        <Link to="/reportar" aria-label="Reportar incidencia" className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-[1250] flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(180deg,#2C92F3,#0B66D0)] text-white shadow-[0_10px_24px_rgb(11_102_208/0.4)] md:hidden">
          <Plus size={28} strokeWidth={2.6} aria-hidden="true" />
        </Link>
      )}
      <nav aria-label="Navegación inferior" className="fixed inset-x-0 bottom-0 z-[1200] flex border-t border-line bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {tabs.map((t) => (
          <Link key={t.to} to={t.to} className={item(t.active)} aria-current={t.active ? 'page' : undefined}>
            <t.icon size={23} aria-hidden="true" strokeWidth={t.active ? 2.4 : 2} />
            <span className={t.active ? 'underline decoration-2 underline-offset-4' : ''}>{t.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}

export function Layout() {
  const { user, persistent, backend } = useReports()
  const [drawer, setDrawer] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { setDrawer(false) }, [pathname])
  const initials = user.alias.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="flex min-h-screen">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[5000] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Saltar al contenido</a>
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[1300] flex h-[64px] items-center gap-3 border-b border-line bg-white/95 px-3 backdrop-blur md:h-[76px] md:gap-4 md:px-7">
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl text-navy hover:bg-soft md:hidden" aria-label="Abrir menú" aria-haspopup="dialog" aria-expanded={drawer} onClick={() => setDrawer(true)}><Menu size={24} /></button>
          <div className="md:hidden"><Logo /></div>
          <div className="hidden w-full max-w-[600px] md:block"><SearchBox /></div>
          <CitySelector />
          <div className="ml-auto flex items-center gap-2 md:gap-3 xl:ml-0">
            <SyncStatus />
            {pathname !== '/' && (
              <Link to="/reportar" className="btn btn-primary hidden whitespace-nowrap !min-h-12 !rounded-xl !px-5 !text-[15px] md:inline-flex"><Plus size={20} strokeWidth={2.6} aria-hidden="true" /> Reportar incidencia</Link>
            )}
            <Notifications />
            <Link to="/perfil" className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-soft text-sm font-bold text-primary-strong md:flex" aria-label={`Perfil de ${user.alias}`} title={user.alias}>
              {initials || <User size={20} />}
            </Link>
          </div>
        </header>
        {!persistent && <div role="alert" className="bg-[#FFF6EC] px-4 py-2 text-center text-sm text-[#7A3E0E]">Tu navegador no permite guardar datos locales: los cambios se perderán al recargar.</div>}
        {backend.kind === 'supabase' && backend.status === 'error' && <div role="alert" className="bg-[#FDECEC] px-4 py-2 text-center text-sm text-[#9B1C1C]">No se pudo conectar con la base de datos compartida: {backend.error}</div>}
        <main id="contenido" className="flex min-w-0 flex-1 flex-col pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
          <Outlet />
          <footer className="mt-auto px-4 py-4 text-xs text-muted md:px-8">
            Reportes y conteos de demostración. URBIA no representa a una autoridad ni certifica incidencias. Mapa base © Esri · © OpenStreetMap.
          </footer>
        </main>
      </div>
      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} />
      <BottomNav />
      <RewardWatcher />
    </div>
  )
}
