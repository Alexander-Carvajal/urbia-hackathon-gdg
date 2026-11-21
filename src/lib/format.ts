const rtf = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' })
const dtf = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const df = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' })

export function relativeTime(isoDate: string, now = Date.now()): string {
  const diff = (new Date(isoDate).getTime() - now) / 1000
  const abs = Math.abs(diff)
  if (abs < 60) return 'hace un momento'
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  return rtf.format(Math.round(diff / 86400), 'day')
}

export const fullDate = (isoDate: string) => dtf.format(new Date(isoDate))
export const shortDate = (isoDate: string) => df.format(new Date(isoDate))

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
