export type CategoryId = 'bache' | 'agua' | 'inundacion'

export type Status = 'pendiente' | 'revision' | 'corroborado' | 'resuelto' | 'descartado'

/** Origen de la información. En el MVP todo proviene de la ciudadanía (demo). */
export type Source = 'ciudadania' | 'externo' | 'autoridad'

export interface Zone {
  id: string
  name: string
  /** Texto corto para listas, p. ej. «Av. Tulum» */
  hint: string
  lat: number
  lng: number
  /** Palabras alternativas para la búsqueda local */
  aliases: string[]
}

export interface HistoryEntry {
  at: string // ISO
  text: string
  by: string
  status?: Status
}

export type ObjectionReason = 'no-existe' | 'ubicacion' | 'duplicado' | 'resuelto' | 'otro'

export interface Objection {
  id: string
  at: string
  reason: ObjectionReason
  detail: string
  by: string
}

export interface Report {
  id: string
  title: string
  category: CategoryId
  description: string
  zoneId: string
  /** Referencia escrita por quien reporta («frente al parque…») */
  reference: string
  lat: number
  lng: number
  /** Precisión aproximada del punto en metros */
  accuracyM: number
  lastConfirmedAt?: string // ISO
  createdAt: string // ISO
  status: Status
  /** true cuando el estado se fijó manualmente (resuelto/descartado) y no lo recalculan las reglas */
  statusLocked: boolean
  statusReason?: string
  source: Source
  authorId: string
  authorAlias: string
  /** Confirmaciones de vecinos ficticios de la semilla (no editables) */
  baseConfirmations: number
  /** IDs de usuarios demo de ESTE navegador que confirmaron */
  confirmedBy: string[]
  /** Evidencias de la semilla (solo conteo; no hay fotos reales en los datos demo) */
  baseEvidence: number
  /** Foto subida en este navegador (data URL ya sin metadatos EXIF) */
  photo?: string | null
  objections: Objection[]
  history: HistoryEntry[]
  isDemoSeed: boolean
  /** Nombre del documento (GeoJSON/CSV) del que se importó, si aplica */
  importedFrom?: string
}

export interface DemoUser {
  id: string
  alias: string
}
