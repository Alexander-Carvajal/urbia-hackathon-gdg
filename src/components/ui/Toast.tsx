import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Tone = 'success' | 'info' | 'warn'
interface ToastItem { id: number; text: string; tone: Tone }
const Ctx = createContext<(text: string, tone?: Tone) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((text: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random()
    setItems((s) => [...s.slice(-2), { id, text, tone }])
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4500)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-24 z-[3000] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {items.map((t) => {
          const I = t.tone === 'success' ? CircleCheck : t.tone === 'warn' ? TriangleAlert : Info
          return (
            <div key={t.id} className="animate-sheet pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-navy px-4 py-3 text-sm text-white shadow-[var(--shadow-float)]">
              <I size={18} className={t.tone === 'warn' ? 'text-[#FFC48A]' : 'text-sky'} aria-hidden="true" />
              <span>{t.text}</span>
              <button type="button" aria-label="Cerrar aviso" className="ml-1 rounded-md p-1 hover:bg-white/10" onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))}><X size={16} /></button>
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
