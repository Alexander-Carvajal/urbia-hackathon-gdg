import { ArrowRight, Check, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '../../components/brand/Brand'
import { Modal } from '../../components/ui'
import { DEMO_PROFILES, safeReturnPath } from '../../features/auth/demoSession'
import { useReports } from '../../features/reports/store'

export function AccessPage() {
  const { demoProfile, signInDemo, backend } = useReports()
  const [choosing, setChoosing] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const next = safeReturnPath(new URLSearchParams(location.search).get('next'))

  const choose = (id: string) => {
    if (!signInDemo(id)) return
    setChoosing(false)
    navigate(next, { replace: true })
  }

  return (
    <div className="relative flex min-h-[calc(100dvh-160px)] flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_0%,#eaf7ff,#f8fbff_56%)] px-4 py-8 md:px-8">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(170deg,transparent_30%,#c7f5ff_31%,#7ee5f3_65%,#087dd9_100%)] opacity-45" aria-hidden="true" />
      <section className="relative flex w-full max-w-[640px] flex-col items-center rounded-[20px] border border-line bg-white px-5 py-8 text-center shadow-[0_18px_55px_rgb(11_42_78/0.10)] sm:px-12 sm:py-11" aria-labelledby="access-title">
        <Logo />
        <h1 id="access-title" className="mt-8 font-display text-[28px] font-extrabold leading-tight text-navy sm:text-[36px]">Bienvenido a URBIA</h1>
        <p className="mt-2 text-[15px] text-muted sm:text-lg">Crea tu cuenta o inicia sesión</p>

        {demoProfile ? (
          <div className="mt-8 flex w-full flex-col items-center gap-4">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white" style={{ background: demoProfile.color }}>{demoProfile.initials}</span>
            <p className="text-sm text-muted">Sesión de demostración activa como <strong className="text-navy">{demoProfile.alias}</strong>.</p>
            <Link to={next} className="btn btn-primary w-full sm:max-w-[360px]">Continuar en URBIA <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
        ) : (
          <>
            <button type="button" className="btn mt-8 w-full border-[1.5px] border-primary bg-white !text-[15px] text-navy hover:bg-soft sm:max-w-[440px]" onClick={() => setChoosing(true)}>
              <span className="bg-[conic-gradient(#4285f4_0_95deg,#34a853_95deg_170deg,#fbbc05_170deg_225deg,#ea4335_225deg_280deg,#4285f4_280deg)] bg-clip-text font-sans text-[23px] font-extrabold leading-none text-transparent" aria-hidden="true">G</span>
              Continuar con Google
            </button>
            <span className="mt-5 rounded-full bg-[#c9f4fb] px-7 py-1.5 text-sm font-bold text-navy">Demostración</span>
            <p className="mt-4 max-w-[380px] text-sm leading-relaxed text-muted">Esta vista simula el acceso con Google. No solicita tu contraseña.</p>
            <Link to="/mapa" className="mt-4 text-sm font-semibold text-primary-strong underline-offset-4 hover:underline">Explorar sin iniciar sesión</Link>
            <div className="mt-7 w-full border-t border-line pt-5 text-sm text-muted">Puedes explorar el mapa y los avisos. Para reportar o corroborar, inicia sesión.</div>
          </>
        )}
      </section>

      <Modal open={choosing} title="Elige un perfil de demostración" onClose={() => setChoosing(false)}>
        <p className="help mb-4">Son perfiles ficticios guardados en este navegador. No usamos cuentas ni credenciales reales de Google.</p>
        <div className="flex flex-col gap-2">
          {DEMO_PROFILES.map((profile) => (
            <button key={profile.id} type="button" className="flex min-h-16 items-center gap-3 rounded-xl border border-line px-3 text-left hover:border-primary hover:bg-soft" onClick={() => choose(profile.id)}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: profile.color }}>{profile.initials}</span>
              <span className="min-w-0 flex-1"><strong className="block text-sm text-navy">{profile.alias}</strong><span className="text-xs text-muted">Perfil ficticio de URBIA</span></span>
              <Check size={17} className="text-primary-strong" aria-hidden="true" />
            </button>
          ))}
        </div>
        {backend.kind === 'supabase' && <p className="help mt-4 flex gap-2"><UserRound size={16} className="shrink-0" aria-hidden="true" />En modo compartido, Supabase conserva la misma identidad anónima de este navegador aunque cambies el alias demo.</p>}
      </Modal>
    </div>
  )
}
