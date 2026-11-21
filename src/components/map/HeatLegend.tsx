import { Loader2 } from 'lucide-react'
import { MenuOption, PopoverButton } from './CategoryChips'
import { cssGradient, DENSITY_STOPS, tempRange, TEMP_STOPS, type TempData, type TempMode } from './HeatLayers'

export type HeatLayer = 'ninguna' | 'densidad' | 'temperatura'

export function HeatLegend({ layer, temp, tempMode, count }: { layer: HeatLayer; temp: { status: string; data?: TempData; error?: string }; tempMode: TempMode; count: number }) {
  if (layer === 'ninguna') return null
  const box = 'absolute bottom-6 right-[64px] z-[600] w-[min(260px,calc(100%-24px))] rounded-xl border border-line bg-white/95 p-3 text-xs shadow-[var(--shadow-soft)]'
  if (layer === 'densidad') {
    return (
      <div className={box} role="note" aria-label="Leyenda del mapa de calor">
        <p className="mb-1.5 font-bold">Densidad de reportes</p>
        <div className="h-2.5 rounded-full" style={{ background: cssGradient(DENSITY_STOPS) }} />
        <div className="mt-1 flex justify-between text-muted"><span>Pocos</span><span>Muchos</span></div>
        <p className="mt-1.5 text-muted">{count} reportes visibles. Pesa más un reporte con más confirmaciones. Respeta los filtros de categoría y estado.</p>
      </div>
    )
  }
  if (temp.status === 'loading' || temp.status === 'idle') return <div className={box}><span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Consultando temperatura…</span></div>
  if (!temp.data) return <div className={box}>No se pudo obtener la temperatura ({temp.error}).</div>
  const vals = temp.data.points.map((p) => (tempMode === 'temp' ? p.temp : p.feels))
  const min = Math.min(...vals), max = Math.max(...vals)
  const [lo, hi] = tempRange(temp.data, tempMode)
  return (
    <div className={box} role="note" aria-label="Leyenda de temperatura">
      <p className="mb-1.5 font-bold">{tempMode === 'temp' ? 'Temperatura del aire' : 'Sensación térmica'}</p>
      <div className="h-2.5 rounded-full" style={{ background: cssGradient(TEMP_STOPS) }} />
      <div className="mt-1 flex justify-between text-muted"><span>{lo} °C</span><span>{((lo + hi) / 2).toFixed(1)} °C</span><span>{hi} °C</span></div>
      <p className="mt-1.5">Ahora en Cancún: <strong>{min.toFixed(1)}–{max.toFixed(1)} °C</strong></p>
      <p className="mt-0.5 text-muted">Open-Meteo, {temp.data.time.slice(11, 16)} h · {temp.data.points.length} puntos interpolados (modelo de ~1–10 km, no sensores de calle). La escala se ajusta a los valores de ahora.</p>
    </div>
  )
}

/** Menú del botón de capas del mapa: mapa de calor + avisos oficiales. */
export function MapLayersMenu({ heat, onHeat, tempMode, onTempMode, avisos, onAvisos, avisosCount }: {
  heat: HeatLayer; onHeat: (l: HeatLayer) => void; tempMode: TempMode; onTempMode: (m: TempMode) => void
  avisos: boolean; onAvisos: (v: boolean) => void; avisosCount: number
}) {
  return (
    <PopoverButton label="Capas del mapa">
      <p className="mb-1 px-1 text-xs font-bold uppercase tracking-wide text-muted">Mapa de calor</p>
      <div role="menu" aria-label="Mapa de calor" className="flex flex-col gap-0.5">
        <MenuOption checked={heat === 'ninguna'} onClick={() => onHeat('ninguna')}>Sin mapa de calor</MenuOption>
        <MenuOption checked={heat === 'densidad'} onClick={() => onHeat('densidad')}>Densidad de reportes</MenuOption>
        <MenuOption checked={heat === 'temperatura' && tempMode === 'temp'} onClick={() => { onHeat('temperatura'); onTempMode('temp') }}>Temperatura</MenuOption>
        <MenuOption checked={heat === 'temperatura' && tempMode === 'feels'} onClick={() => { onHeat('temperatura'); onTempMode('feels') }}>Sensación térmica</MenuOption>
      </div>
      <p className="mb-1 mt-3 px-1 text-xs font-bold uppercase tracking-wide text-muted">Otras capas</p>
      <MenuOption kind="check" checked={avisos} onClick={() => onAvisos(!avisos)}>Avisos oficiales <span className="ml-auto text-xs text-muted">{avisosCount}</span></MenuOption>
    </PopoverButton>
  )
}
