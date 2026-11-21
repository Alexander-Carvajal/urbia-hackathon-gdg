import { ArrowRight, CloudFog, CloudLightning, CloudRain, Droplet, Moon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fullDate } from '../../lib/format'
import { weatherLabel, type RainInfo } from './api'
import { useAvisos } from './AvisosProvider'

/** Icono del clima: sol + nube (como en el diseño), o el icono que corresponda al código WMO. */
export function WeatherIcon({ code, isDay, size = 44 }: { code: number; isDay: boolean; size?: number }) {
  if (code >= 95) return <CloudLightning size={size} className="text-[#6A5AE0]" strokeWidth={1.6} aria-hidden="true" />
  if (code >= 51) return <CloudRain size={size} className="text-primary" strokeWidth={1.6} aria-hidden="true" />
  if (code >= 45 && code <= 48) return <CloudFog size={size} className="text-muted" strokeWidth={1.6} aria-hidden="true" />
  if (!isDay && code <= 1) return <Moon size={size} className="text-[#5B6CD9]" strokeWidth={1.6} aria-hidden="true" />
  const cloud = code >= 1
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <g stroke="#F5A524" strokeWidth="2.2" strokeLinecap="round">
        <circle cx={cloud ? 18 : 24} cy={cloud ? 17 : 24} r="7" fill="#FFF4D6" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
          const cx = cloud ? 18 : 24, cy = cloud ? 17 : 24, r1 = 10.5, r2 = 13.5, t = (a * Math.PI) / 180
          return <path key={a} d={`M${cx + r1 * Math.cos(t)} ${cy + r1 * Math.sin(t)}L${cx + r2 * Math.cos(t)} ${cy + r2 * Math.sin(t)}`} />
        })}
      </g>
      {cloud && <path d="M17 39h18.5a7 7 0 0 0 .6-14 9.5 9.5 0 0 0-18.2 2.4A5.9 5.9 0 0 0 17 39z" fill="#fff" stroke="#3B9BEF" strokeWidth="2.2" strokeLinejoin="round" />}
    </svg>
  )
}

function useWeather(): RainInfo | null {
  const { rain } = useAvisos()
  return rain.data
}

/** Tarjeta «Clima en Cancún» (inicio, escritorio). */
export function WeatherCard() {
  const w = useWeather()
  const { rain } = useAvisos()
  return (
    <section className="card flex items-center gap-3 px-4 py-4" aria-label="Clima en Cancún">
      {w ? <WeatherIcon code={w.current.code} isDay={w.current.isDay} size={44} /> : <span className="h-11 w-11 animate-pulse rounded-full bg-soft" />}
      <div className="min-w-0 flex-1">
        <p className="whitespace-nowrap text-[13px] text-muted">Clima en Cancún</p>
        <p className="font-display text-[28px] font-extrabold leading-none">{w ? `${Math.round(w.current.temp)}°C` : '—'}</p>
        <p className="mt-1.5 whitespace-nowrap text-[12px] text-muted">
          {w ? <>{weatherLabel(w.current.code)} · {w.current.time.slice(11, 16)} h</> : rain.status === 'error' ? 'Sin datos de clima' : 'Cargando…'}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 border-l border-line pl-3">
        <p className="flex items-center gap-1 font-display text-[20px] font-extrabold"><Droplet size={16} className="text-primary" aria-hidden="true" />{w ? `${w.probSoon}%` : '—'}</p>
        <p className="whitespace-nowrap text-[12px] text-muted">prob. de lluvia</p>
        <Link to="/mapa?capa=temperatura" className="mt-1 flex items-center gap-1 whitespace-nowrap text-[13px] font-semibold text-primary-strong hover:underline">Ver en el mapa <ArrowRight size={14} aria-hidden="true" /></Link>
      </div>
    </section>
  )
}

/** Franja horizontal del clima (mapa de incidencias). */
export function WeatherStrip() {
  const w = useWeather()
  return (
    <section className="card flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3" aria-label="Clima en Cancún">
      <div className="flex items-center gap-3">
        {w ? <WeatherIcon code={w.current.code} isDay={w.current.isDay} size={40} /> : <span className="h-10 w-10 animate-pulse rounded-full bg-soft" />}
        <div><p className="text-[12px] text-muted">Clima en Cancún</p><p className="font-display text-[22px] font-extrabold leading-none">{w ? `${Math.round(w.current.temp)}°C` : '—'}</p></div>
      </div>
      <span className="hidden h-10 w-px bg-line sm:block" aria-hidden="true" />
      <div className="flex items-center gap-2">
        <Droplet size={18} className="text-primary" aria-hidden="true" />
        <div><p className="font-display text-[18px] font-extrabold leading-none">{w ? `${w.probSoon}%` : '—'}</p><p className="text-[12px] text-muted">prob. de lluvia</p></div>
      </div>
      <span className="hidden h-10 w-px bg-line sm:block" aria-hidden="true" />
      <p className="text-[12px] leading-snug text-muted">Contexto · Actualizado<br />{w ? fullDate(w.current.time + ':00-05:00') : '—'}</p>
      <Link to="/mapa?capa=temperatura" className="ml-auto flex items-center gap-1 text-[13px] font-semibold text-primary-strong hover:underline">Ver en el mapa <ArrowRight size={14} aria-hidden="true" /></Link>
    </section>
  )
}

/** Píldora compacta (inicio, móvil). */
export function WeatherPill() {
  const w = useWeather()
  return (
    <Link to="/mapa?capa=temperatura" className="card flex items-center justify-around gap-3 px-4 py-2.5" aria-label="Clima en Cancún">
      <span className="flex items-center gap-2 font-display text-[20px] font-extrabold">
        {w ? <WeatherIcon code={w.current.code} isDay={w.current.isDay} size={32} /> : null}{w ? `${Math.round(w.current.temp)}°C` : '—'}
      </span>
      <span className="h-7 w-px bg-line" aria-hidden="true" />
      <span className="flex items-center gap-1.5 text-[15px]"><Droplet size={18} className="text-primary" aria-hidden="true" /><strong className="font-display text-[18px] font-extrabold">{w ? `${w.probSoon}%` : '—'}</strong> lluvia</span>
    </Link>
  )
}
