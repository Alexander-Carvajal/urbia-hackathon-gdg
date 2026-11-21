import L from 'leaflet'
import { CATEGORIES } from '../../data/categories'
import type { CategoryId } from '../../types'

import { CATEGORY_PATHS } from './categorySymbols'

export function pinSvg(category: CategoryId, size = 34): string {
  const c = CATEGORIES[category].color
  return `<svg class="pin-body" width="${size}" height="${Math.round(size * 1.2)}" viewBox="0 0 34 41" aria-hidden="true">
    <path d="M17 40s14-12.6 14-24A14 14 0 0 0 3 16c0 11.4 14 24 14 24z" fill="${c}" stroke="#fff" stroke-width="2.5"/>
    <g transform="translate(9.5 8.5) scale(0.625)" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${CATEGORY_PATHS[category].map(d => '<path d="' + d + '"/>').join('')}</g>
  </svg>`
}

/** Marco de esquinas (estilo «enfoque») alrededor del pin seleccionado. */
const FRAME = '<svg class="pin-frame" width="56" height="64" viewBox="0 0 56 64" aria-hidden="true" fill="none" stroke="#F07A1E" stroke-width="2.5" stroke-linecap="round"><path d="M3 13V3h10"/><path d="M43 3h10v10"/><path d="M53 51v10H43"/><path d="M13 61H3V51"/></svg>'

const cache = new Map<string, L.DivIcon>()
export function pinIcon(category: CategoryId, selected = false, confirmations = 0): L.DivIcon {
  const level = confirmations === 0 ? 0 : confirmations < 2 ? 1 : confirmations < 5 ? 2 : 3
  const key = category + selected + level
  const hit = cache.get(key)
  if (hit) return hit
  const icon = selected
    ? L.divIcon({
      className: 'urbia-pin is-selected pin-confidence-' + level,
      html: `<div style="position:relative;width:56px;height:64px">${FRAME}<div style="position:absolute;left:11px;top:6px">${pinSvg(category)}</div></div>`,
      iconSize: [56, 64], iconAnchor: [28, 46],
    })
    : L.divIcon({ className: 'urbia-pin pin-confidence-' + level, html: pinSvg(category), iconSize: [34, 41], iconAnchor: [17, 40] })
  cache.set(key, icon)
  return icon
}

export const draftPinIcon = L.divIcon({
  className: 'urbia-pin',
  html: `<svg width="38" height="46" viewBox="0 0 34 41" aria-hidden="true"><path d="M17 40s14-12.6 14-24A14 14 0 0 0 3 16c0 11.4 14 24 14 24z" fill="#0B2A4E" stroke="#fff" stroke-width="2.5"/><circle cx="17" cy="16" r="5" fill="#2BB5F0"/></svg>`,
  iconSize: [38, 46], iconAnchor: [19, 45],
})

export const userIcon = L.divIcon({ className: 'urbia-user', html: '<span aria-hidden="true"></span>', iconSize: [22, 22], iconAnchor: [11, 11] })
export const routeOriginIcon = L.divIcon({
  className: 'urbia-route-origin',
  html: '<span aria-hidden="true">A</span>',
  iconSize: [24, 24], iconAnchor: [12, 12],
})

export function clusterIcon(cluster: { getChildCount: () => number }): L.DivIcon {
  return L.divIcon({ className: 'urbia-cluster', html: `<span>${cluster.getChildCount()}</span>`, iconSize: [40, 40] })
}
