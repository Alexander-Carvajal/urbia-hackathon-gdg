import type { CategoryId, Status } from '../types'

export interface CategoryMeta {
  id: CategoryId
  label: string
  short: string
  /** Color semántico: solo pines, puntos y etiquetas */
  color: string
  /** Fondo muy suave para la etiqueta */
  tint: string
  /** Texto de la etiqueta con contraste AA */
  ink: string
  example: string
  /** Etiqueta de grupo para tarjetas («Infraestructura», etc.) */
  group: string
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  bache: {
    id: 'bache', label: 'Bache', short: 'Baches', color: '#F07A1E', tint: '#FEF0E4', ink: '#8A4410', group: 'Infraestructura',
    example: 'Ej. «Bache profundo en el carril derecho, junto al semáforo»',
  },
  agua: {
    id: 'agua', label: 'Falta de agua', short: 'Agua', color: '#1E88E5', tint: '#E6F2FD', ink: '#0B5B96', group: 'Agua potable',
    example: 'Ej. «Sin agua potable desde ayer en toda la cuadra»',
  },
  inundacion: {
    id: 'inundacion', label: 'Inundación / encharcamiento', short: 'Inundaciones', color: '#8E5BD6', tint: '#F2ECFB', ink: '#5B3596', group: 'Inundaciones',
    example: 'Ej. «Agua acumulada que cubre media calle después de la lluvia»',
  },
}

export const CATEGORY_IDS: CategoryId[] = ['bache', 'agua', 'inundacion']

export interface StatusMeta {
  id: Status
  label: string
  long: string
  bg: string
  fg: string
  border: string
  help: string
}

export const STATUSES: Record<Status, StatusMeta> = {
  pendiente: {
    id: 'pendiente', label: 'Pendiente', long: 'Pendiente', bg: '#F2F6FA', fg: '#46596C', border: '#DCE6EF',
    help: 'Publicado; aún no tiene corroboraciones suficientes.',
  },
  revision: {
    id: 'revision', label: 'En revisión', long: 'En revisión comunitaria', bg: '#EAF7FF', fg: '#0A5C9E', border: '#BFE3FA',
    help: 'Ya tiene confirmaciones; la comunidad revisa aportes y coincidencias.',
  },
  corroborado: {
    id: 'corroborado', label: 'Corroborado', long: 'Corroborado por vecinos', bg: '#E8F7EE', fg: '#17663A', border: '#BFE7CF',
    help: 'Cumple la regla demo de corroboración. No es una validación oficial.',
  },
  resuelto: {
    id: 'resuelto', label: 'Resuelto (declarado)', long: 'Resuelto (declarado)', bg: '#0C3159', fg: '#FFFFFF', border: '#0C3159',
    help: 'Alguien declaró que se atendió; se indica quién lo marcó. No implica intervención municipal.',
  },
  descartado: {
    id: 'descartado', label: 'Descartado', long: 'Descartado / duplicado', bg: '#F4F5F7', fg: '#5B6470', border: '#E1E4E8',
    help: 'No se pudo confirmar o duplicaba otro reporte; se muestra el motivo.',
  },
}

export const STATUS_ORDER: Status[] = ['pendiente', 'revision', 'corroborado', 'resuelto', 'descartado']

/** Regla demo de corroboración, visible en la interfaz. */
export const RULES = {
  revisionAt: 2,
  corroboradoAt: 5,
  minEvidence: 1,
}
