import { createLucideIcon } from 'lucide-react'
import type { CategoryId } from '../../types'

// Trazos Lucide compartidos por los controles React y los pines Leaflet.
export const CATEGORY_PATHS: Record<CategoryId, string[]> = {
  bache: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'],
  agua: ['M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z'],
  inundacion: ['M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242', 'M16 14v6', 'M8 14v6', 'M12 16v6'],
}

export const CATEGORY_ICON = {
  bache: createLucideIcon({ name: 'bache', size: 24, node: CATEGORY_PATHS.bache.map(d => ['path', { d, key: d }]) }),
  agua: createLucideIcon({ name: 'agua', size: 24, node: CATEGORY_PATHS.agua.map(d => ['path', { d, key: d }]) }),
  inundacion: createLucideIcon({ name: 'inundacion', size: 24, node: CATEGORY_PATHS.inundacion.map(d => ['path', { d, key: d }]) }),
}
