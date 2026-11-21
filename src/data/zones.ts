import type { Zone } from '../types'

/**
 * Zonas generales de Cancún con coordenadas aproximadas e ilustrativas.
 * No son límites oficiales de colonias ni de regiones.
 */
export const ZONES: Zone[] = [
  { id: 'centro', name: 'Centro', hint: 'Av. Tulum', lat: 21.1612, lng: -86.8268, aliases: ['centro', 'tulum', 'av tulum', 'ayuntamiento'] },
  { id: 'norte', name: 'Zona Norte', hint: 'Av. López Portillo', lat: 21.1712, lng: -86.8400, aliases: ['norte', 'lopez portillo', 'portillo'] },
  { id: 'puerto', name: 'Puerto Juárez', hint: 'Costa norte', lat: 21.1835, lng: -86.8065, aliases: ['puerto juarez', 'puerto', 'juarez'] },
  { id: 'poniente', name: 'Zona Poniente', hint: 'Regiones 90–100', lat: 21.1602, lng: -86.8752, aliases: ['poniente', 'region 100', 'regiones', 'region 94', 'region 96'] },
  { id: 'tajamar', name: 'Malecón Tajamar', hint: 'Orilla de la laguna', lat: 21.1500, lng: -86.8190, aliases: ['tajamar', 'malecon', 'bonampak'] },
  { id: 'colosio', name: 'Av. Colosio', hint: 'Salida al aeropuerto', lat: 21.1320, lng: -86.8558, aliases: ['colosio', 'aeropuerto'] },
  { id: 'sur', name: 'Zona Sur', hint: 'Av. Huayacán', lat: 21.1222, lng: -86.8378, aliases: ['sur', 'huayacan', 'av huayacan'] },
  { id: 'hotelera', name: 'Zona Hotelera', hint: 'Blvd. Kukulcán', lat: 21.1290, lng: -86.7492, aliases: ['zona hotelera', 'hotelera', 'kukulcan', 'punta cancun'] },
]

export const zoneById = (id: string): Zone | undefined => ZONES.find((z) => z.id === id)

export const CANCUN_CENTER: [number, number] = [21.145, -86.825]
export const CANCUN_ZOOM = 13
