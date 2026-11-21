import L from 'leaflet'
import { CATEGORIES } from '../../data/categories'
import type { CategoryId } from '../../types'

// Trazos de los iconos Lucide (TriangleAlert, Droplet, CloudRain) para usarlos dentro de un divIcon
const GLYPH: Record<CategoryId, string> = {
  bache: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  agua: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  inundacion: '<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/>',
}

export function pinSvg(category: CategoryId, size = 34): string {
  const c = CATEGORIES[category].color
  return `<svg class="pin-body" width="${size}" height="${Math.round(size * 1.2)}" viewBox="0 0 34 41" aria-hidden="true">
    <path d="M17 40s14-12.6 14-24A14 14 0 0 0 3 16c0 11.4 14 24 14 24z" fill="${c}" stroke="#fff" stroke-width="2.5"/>
    <g transform="translate(9.5 8.5) scale(0.625)" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${GLYPH[category]}</g>
  </svg>`
}

/** Marco de esquinas (estilo «enfoque») alrededor del pin seleccionado. */
const FRAME = '<svg class="pin-frame" width="56" height="64" viewBox="0 0 56 64" aria-hidden="true" fill="none" stroke="#F07A1E" stroke-width="2.5" stroke-linecap="round"><path d="M3 13V3h10"/><path d="M43 3h10v10"/><path d="M53 51v10H43"/><path d="M13 61H3V51"/></svg>'

const cache = new Map<string, L.DivIcon>()
export function pinIcon(category: CategoryId, selected = false): L.DivIcon {
  const key = category + selected
  const hit = cache.get(key)
  if (hit) return hit
  const icon = selected
    ? L.divIcon({
      className: 'urbia-pin is-selected',
      html: `<div style="position:relative;width:56px;height:64px">${FRAME}<div style="position:absolute;left:11px;top:6px">${pinSvg(category)}</div></div>`,
      iconSize: [56, 64], iconAnchor: [28, 46],
    })
    : L.divIcon({ className: 'urbia-pin', html: pinSvg(category), iconSize: [34, 41], iconAnchor: [17, 40] })
  cache.set(key, icon)
  return icon
}

export const draftPinIcon = L.divIcon({
  className: 'urbia-pin',
  html: `<svg width="38" height="46" viewBox="0 0 34 41" aria-hidden="true"><path d="M17 40s14-12.6 14-24A14 14 0 0 0 3 16c0 11.4 14 24 14 24z" fill="#0B2A4E" stroke="#fff" stroke-width="2.5"/><circle cx="17" cy="16" r="5" fill="#2BB5F0"/></svg>`,
  iconSize: [38, 46], iconAnchor: [19, 45],
})

export const userIcon = L.divIcon({ className: 'urbia-user', html: '<span></span>', iconSize: [18, 18], iconAnchor: [9, 9] })

export function clusterIcon(cluster: { getChildCount: () => number }): L.DivIcon {
  return L.divIcon({ className: 'urbia-cluster', html: `<span>${cluster.getChildCount()}</span>`, iconSize: [40, 40] })
}
