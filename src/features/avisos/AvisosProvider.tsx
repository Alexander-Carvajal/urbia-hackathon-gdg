import L from 'leaflet'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Marker, Popup } from 'react-leaflet'
import { shortDate } from '../../lib/format'
import { AVISO_SOURCES, AVISO_TYPES, avisoDate, fetchAvisos, fetchRain, type Aviso, type AvisoType, type RainInfo } from './api'

type Load<T> = { status: 'loading' | 'ok' | 'error'; data: T | null; error?: string; fetchedAt?: string; fromCache?: boolean; partialErrors?: string[] }

interface Ctx {
  avisos: Load<Aviso[]>
  rain: Load<RainInfo>
  refresh: () => void
}

const AvisosCtx = createContext<Ctx | null>(null)

export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Load<Aviso[]>>({ status: 'loading', data: null })
  const [rain, setRain] = useState<Load<RainInfo>>({ status: 'loading', data: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const ac = new AbortController()
    const force = tick > 0
    setAvisos((s) => ({ ...s, status: s.data ? s.status : 'loading' }))
    fetchAvisos(force, ac.signal)
      .then((r) => setAvisos({ status: 'ok', data: r.avisos, fetchedAt: r.fetchedAt, fromCache: r.fromCache, partialErrors: r.errors }))
      .catch((e: Error) => { if (!ac.signal.aborted) setAvisos((s) => ({ ...s, status: 'error', error: e.message })) })
    fetchRain(ac.signal)
      .then((r) => setRain({ status: 'ok', data: r, fetchedAt: new Date().toISOString() }))
      .catch((e: Error) => { if (!ac.signal.aborted) setRain((s) => ({ ...s, status: 'error', error: e.message })) })
    return () => ac.abort()
  }, [tick])

  const refresh = useCallback(() => setTick((t) => t + 1), [])
  const value = useMemo(() => ({ avisos, rain, refresh }), [avisos, rain, refresh])
  return <AvisosCtx.Provider value={value}>{children}</AvisosCtx.Provider>
}

export function useAvisos(): Ctx {
  const v = useContext(AvisosCtx)
  if (!v) throw new Error('useAvisos debe usarse dentro de AvisosProvider')
  return v
}

/** Avisos recientes de Cancún con ubicación inferida (para capas del mapa). */
export function useMappableAvisos(days = 30): Aviso[] {
  const { avisos } = useAvisos()
  return useMemo(() => {
    const min = Date.now() - days * 86400_000
    return (avisos.data ?? []).filter((a) => a.city !== 'otra' && a.places.length > 0 && Date.parse(avisoDate(a.date)) >= min)
  }, [avisos.data, days])
}

const iconCache = new Map<AvisoType, L.DivIcon>()
export function avisoIcon(type: AvisoType): L.DivIcon {
  const hit = iconCache.get(type)
  if (hit) return hit
  const c = AVISO_TYPES[type].color
  const icon = L.divIcon({
    className: 'urbia-pin',
    html: `<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><rect x="3" y="3" width="24" height="24" rx="7" transform="rotate(45 15 15)" fill="${c}" stroke="#fff" stroke-width="2.5"/><path d="M15 8.5c-2.6 3.4-4 5.6-4 7.4a4 4 0 0 0 8 0c0-1.8-1.4-4-4-7.4z" fill="#fff"/></svg>`,
    iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -12],
  })
  iconCache.set(type, icon)
  return icon
}

/** Capa de avisos de Aguakan para usar dentro de un MapContainer. */
export function AvisosLayer({ avisos }: { avisos: Aviso[] }) {
  return (
    <>
      {avisos.flatMap((a) => a.places.map((p, i) => (
        <Marker key={`${a.key}-${i}`} position={[p.lat, p.lng]} icon={avisoIcon(a.type)} title={`Aviso ${AVISO_SOURCES[a.source].short}: ${a.title}`} zIndexOffset={-200}>
          <Popup maxWidth={280}>
            <div style={{ fontFamily: 'var(--font-sans)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: AVISO_TYPES[a.type].ink, textTransform: 'uppercase', letterSpacing: '.03em' }}>{AVISO_SOURCES[a.source].short} · {AVISO_TYPES[a.type].label}</div>
              <div style={{ fontWeight: 700, margin: '4px 0', fontSize: 13, lineHeight: 1.3 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: '#59748D' }}>{shortDate(avisoDate(a.date))} · cerca de {p.name} (ubicación aproximada)</div>
              <a href={a.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 600 }}>Ver aviso oficial ↗</a>
            </div>
          </Popup>
        </Marker>
      )))}
    </>
  )
}
