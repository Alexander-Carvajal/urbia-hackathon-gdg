import type { CategoryId, Report, Status } from '../types'
import { applyRules } from '../lib/rules'

interface SeedDef {
  id: string
  category: CategoryId
  title: string
  description: string
  zoneId: string
  reference: string
  lat: number
  lng: number
  hoursAgo: number
  confirmations: number
  evidence: number
  author: string
  locked?: { status: Status; reason: string; by: string; hoursAgo: number }
}

/**
 * Datos de demostración totalmente ficticios. Coordenadas plausibles pero ilustrativas.
 * Las fechas se generan relativas al momento de la primera carga, por eso nunca quedan en el futuro.
 */
const DEFS: SeedDef[] = [
  // Zona Sur: baches + encharcamientos cercanos
  { id: 'cun-1001', category: 'bache', title: 'Bache profundo junto al semáforo', description: 'Bache de casi un metro en el carril derecho. Con lluvia se llena de agua y deja de verse; varios autos frenan de golpe.', zoneId: 'sur', reference: 'Cerca de Av. Huayacán (ubicación ilustrativa)', lat: 21.1225, lng: -86.8382, hoursAgo: 26, confirmations: 7, evidence: 2, author: 'Vecina Huayacán' },
  { id: 'cun-1002', category: 'inundacion', title: 'Encharcamiento que cubre media calle', description: 'El agua no drena desde la tarde y llega a la banqueta. Los peatones bajan al arroyo vehicular para pasar.', zoneId: 'sur', reference: 'A dos cuadras de Av. Huayacán (ubicación ilustrativa)', lat: 21.1238, lng: -86.8366, hoursAgo: 20, confirmations: 3, evidence: 1, author: 'Ciclista del sur' },
  { id: 'cun-1003', category: 'bache', title: 'Hundimiento cerca de una coladera', description: 'El pavimento se está hundiendo alrededor de la coladera; empeoró tras las últimas lluvias.', zoneId: 'sur', reference: 'Calle lateral, Zona Sur (ubicación ilustrativa)', lat: 21.1209, lng: -86.8395, hoursAgo: 6, confirmations: 1, evidence: 0, author: 'Vecino 207' },
  { id: 'cun-1004', category: 'inundacion', title: 'Calle inundada, paso complicado', description: 'Nivel de agua estimado de 25–30 cm. Autos pequeños prefieren dar la vuelta.', zoneId: 'sur', reference: 'Zona Sur (ubicación ilustrativa)', lat: 21.1215, lng: -86.8359, hoursAgo: 50, confirmations: 6, evidence: 2, author: 'Vecina Huayacán' },
  // Zona Poniente: falta de agua en varias cuadras
  { id: 'cun-1005', category: 'agua', title: 'Sin agua potable desde ayer', description: 'Varias casas de la misma cuadra reportan no tener suministro desde ayer por la mañana.', zoneId: 'poniente', reference: 'Regiones 90–100 (ubicación ilustrativa)', lat: 21.1602, lng: -86.8748, hoursAgo: 30, confirmations: 9, evidence: 1, author: 'Vecino poniente' },
  { id: 'cun-1006', category: 'agua', title: 'Baja presión y luego sin agua', description: 'Primero bajó la presión y después dejó de salir agua. Los tinacos ya están vacíos.', zoneId: 'poniente', reference: 'Zona Poniente (ubicación ilustrativa)', lat: 21.1590, lng: -86.8771, hoursAgo: 18, confirmations: 4, evidence: 1, author: 'Mamá de la cuadra' },
  { id: 'cun-1007', category: 'agua', title: 'Cuadra completa sin suministro', description: 'Desde la mañana no hay agua en ninguna casa de la calle.', zoneId: 'poniente', reference: 'Zona Poniente (ubicación ilustrativa)', lat: 21.1618, lng: -86.8730, hoursAgo: 3, confirmations: 1, evidence: 0, author: 'Vecino 451' },
  // Centro: concentración de inundaciones
  { id: 'cun-1008', category: 'inundacion', title: 'Avenida con agua acumulada', description: 'Después del aguacero se formó un charco grande en el carril de baja velocidad; el transporte público lo esquiva.', zoneId: 'centro', reference: 'Cerca de Av. Tulum (ubicación ilustrativa)', lat: 21.1615, lng: -86.8268, hoursAgo: 10, confirmations: 8, evidence: 3, author: 'Comerciante del centro' },
  { id: 'cun-1009', category: 'inundacion', title: 'Paso peatonal inundado', description: 'El cruce peatonal queda bajo el agua; las personas mayores no pueden cruzar.', zoneId: 'centro', reference: 'Centro (ubicación ilustrativa)', lat: 21.1631, lng: -86.8252, hoursAgo: 9, confirmations: 3, evidence: 1, author: 'Vecino 118' },
  { id: 'cun-1010', category: 'inundacion', title: 'Estacionamiento con agua estancada', description: 'Agua estancada desde ayer; empieza a oler mal.', zoneId: 'centro', reference: 'Centro (ubicación ilustrativa)', lat: 21.1600, lng: -86.8285, hoursAgo: 8, confirmations: 0, evidence: 0, author: 'Vecina 330' },
  // Reportes aislados
  { id: 'cun-1011', category: 'bache', title: 'Baches en carril de incorporación', description: 'Tres baches seguidos en el carril de incorporación.', zoneId: 'norte', reference: 'Av. López Portillo (ubicación ilustrativa)', lat: 21.1712, lng: -86.8418, hoursAgo: 140, confirmations: 5, evidence: 2, author: 'Taxista norte', locked: { status: 'resuelto', reason: 'Declarado resuelto por moderación comunitaria demo tras 3 fotos de la reparación. No hay confirmación municipal.', by: 'Moderación comunitaria (demo)', hoursAgo: 30 } },
  { id: 'cun-1012', category: 'agua', title: 'Fuga visible en la banqueta', description: 'Fuga constante desde un registro; el agua corre hacia la calle.', zoneId: 'puerto', reference: 'Puerto Juárez (ubicación ilustrativa)', lat: 21.1835, lng: -86.8060, hoursAgo: 12, confirmations: 1, evidence: 0, author: 'Vecino 72' },
  { id: 'cun-1013', category: 'bache', title: 'Bache en paradero de transporte', description: 'El autobús frena dentro del bache para dejar pasaje; salpica a quienes esperan.', zoneId: 'colosio', reference: 'Av. Colosio (ubicación ilustrativa)', lat: 21.1318, lng: -86.8565, hoursAgo: 70, confirmations: 5, evidence: 1, author: 'Usuaria de transporte' },
  { id: 'cun-1014', category: 'inundacion', title: 'Encharcamiento en bulevar costero', description: 'Charco amplio en el carril de baja velocidad después de la lluvia.', zoneId: 'hotelera', reference: 'Blvd. Kukulcán (ubicación ilustrativa)', lat: 21.1290, lng: -86.7490, hoursAgo: 14, confirmations: 2, evidence: 1, author: 'Trabajador hotelero' },
  { id: 'cun-1015', category: 'bache', title: 'Bache en el acceso al malecón', description: 'Bache en la entrada vehicular del malecón.', zoneId: 'tajamar', reference: 'Malecón Tajamar (ubicación ilustrativa)', lat: 21.1500, lng: -86.8190, hoursAgo: 96, confirmations: 0, evidence: 0, author: 'Corredor matutino', locked: { status: 'descartado', reason: 'Duplicado de otro reporte del mismo punto que ya fue declarado resuelto.', by: 'Moderación comunitaria (demo)', hoursAgo: 80 } },
  { id: 'cun-1016', category: 'agua', title: 'Agua turbia en la llave', description: 'El agua sale turbia desde anoche; no sabemos si es seguro usarla.', zoneId: 'norte', reference: 'Zona Norte (ubicación ilustrativa)', lat: 21.1765, lng: -86.8330, hoursAgo: 2, confirmations: 0, evidence: 0, author: 'Vecina 509' },
]

const iso = (now: number, hoursAgo: number) => new Date(now - hoursAgo * 3600_000).toISOString()

export function buildSeed(now = Date.now()): Report[] {
  return DEFS.map((d) => {
    const createdAt = iso(now, d.hoursAgo)
    const base: Report = {
      id: d.id, title: d.title, category: d.category, description: d.description, zoneId: d.zoneId, reference: d.reference,
      lat: d.lat, lng: d.lng, accuracyM: 150, createdAt, status: 'pendiente', statusLocked: false, source: 'ciudadania',
      authorId: 'seed-' + d.author.toLowerCase().replace(/\s+/g, '-'), authorAlias: d.author,
      baseConfirmations: d.confirmations, confirmedBy: [], baseEvidence: d.evidence, photo: null, objections: [],
      history: [{ at: createdAt, text: 'Reporte publicado', by: d.author, status: 'pendiente' }],
      isDemoSeed: true,
    }
    // Reproduce el historial que habría generado la regla demo
    let r = applyRules(base, 'Comunidad (demo)', iso(now, d.hoursAgo * 0.6))
    if (d.locked) {
      r = {
        ...r, status: d.locked.status, statusLocked: true, statusReason: d.locked.reason,
        history: [...r.history, { at: iso(now, d.locked.hoursAgo), text: d.locked.reason, by: d.locked.by, status: d.locked.status }],
      }
    }
    return r
  })
}
