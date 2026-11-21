# URBIA Cancún — Inteligencia urbana colaborativa

Prototipo funcional (React + Vite + TypeScript + Tailwind CSS + Leaflet/OpenStreetMap) para demostración de hackatón.
**Todos los reportes son datos de demostración ficticios.** URBIA no representa a una autoridad ni certifica incidencias.

## Ejecutar

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # versión para hosting en dist/ (incluye manifest y service worker PWA)
npm run preview        # sirve dist/ en http://localhost:4173
npm run build:single   # un solo archivo autocontenido en dist-single/index.html
npm run typecheck      # comprobación de tipos
```

Requiere Node 20 o superior. El mapa base necesita internet (mosaicos de Esri World Street Map con datos de OpenStreetMap; sin API key, requiere atribución).

## Rutas

Se usa `HashRouter` (`#/mapa`, `#/reportes/:id`…) para que funcione en cualquier hosting estático y al abrir el HTML único con doble clic.

| Ruta | Pantalla |
|---|---|
| `#/` | Inicio: 3 métricas calculadas, mapa, conexión urbana destacada |
| `#/mapa` | Mapa urbano: filtros de categoría/estado, búsqueda, panel contextual y capas de calor (`?capa=densidad` o `?capa=temperatura`) |
| `#/reportes` | Listado con buscador, filtros por estado y orden |
| `#/reportes/:id` | Detalle: evidencia, mapa, corroboración, objeciones, historial, relacionados |
| `#/reportar` | Asistente de 4 pasos que publica en `localStorage` |
| `#/analisis` | Conexiones urbanas (+ estadísticas reales del dataset, clima y ambiente «próximamente») |
| `#/avisos` | Avisos oficiales de Aguakan y del Gobierno de Quintana Roo (APIs WordPress públicas) + pronóstico de lluvia y riesgo de encharcamiento (Open-Meteo) |
| `#/datos` | Importar baches / zonas encharcadas desde GeoJSON o CSV; exportar reportes como GeoJSON o CSV |
| `#/perfil` | Perfil demo: puntos, niveles e insignias, mis reportes, corroboraciones, restablecer demo, instalar PWA |

## Estructura

```
src/
  app/                 router, layout (header, navegación lateral, bottom nav) y páginas
  components/ui/       badges, notices, modal accesible, toasts
  components/map/      mapa Leaflet, pines, filtros, panel lateral / drawer / bottom sheet
  features/reports/    store (estado + persistencia), corroboración y objeciones, asistente
  features/connections/detect.ts   detección de coincidencias (Haversine + ventana temporal)
  features/analysis/   página de análisis
  data/                semilla ficticia, categorías/estados/reglas, zonas generales
  lib/                 storage, geodistancia, búsqueda local, fechas, procesamiento de fotos
  types/               tipos TypeScript
  styles/              tokens de color, tipografía y estilos base
```

## Reglas demo

- **Corroboración:** 2+ confirmaciones → *En revisión comunitaria*; 5+ confirmaciones y al menos 1 evidencia → *Corroborado por vecinos*. Un reporte nuevo empieza *Pendiente*.
- Un usuario demo (identificador aleatorio por navegador) solo puede confirmar una vez; el autor no puede autocorroborarse.
- **Conexiones:** reportes activos a ≤ 500 m y ≤ 7 días entre sí (parámetros ajustables en la vista). Se describen como coincidencias, nunca como causas.
- *Resuelto (declarado)* y *Descartado* solo se fijan con un motivo y quién lo marcó (en la semilla: «Moderación comunitaria (demo)»).

## Base de datos compartida (Supabase)

Sin configuración la app funciona en **modo local** (localStorage). Para que todas las personas vean y corroboren los mismos reportes:

1. Crea un proyecto gratuito en https://supabase.com.
2. **Authentication → Sign In / Providers → Anonymous sign-ins: activar.** (Cada navegador recibe un usuario anónimo; no se piden datos personales.)
3. **SQL Editor**: ejecuta `supabase/schema.sql` (tablas, reglas de seguridad RLS, triggers de corroboración, bucket de fotos y tiempo real). Opcional: ejecuta `supabase/seed.sql` para cargar los reportes de demostración (`npm run seed:sql` lo regenera con fechas recientes).
4. Copia `.env.example` como `.env.local` y pega *Project URL* y la clave *anon public* (Project Settings → API).
5. Reinicia `npm run dev`. El encabezado mostrará «En línea».

Qué hace el servidor: una confirmación por persona y reporte (clave primaria), nadie puede corroborar su propio reporte ni editar o borrar datos, el estado (*Pendiente → En revisión → Corroborado*) lo recalcula un trigger en Postgres y el historial lo escriben los triggers. Las fotos van al bucket público `report-photos`. Los cambios de otras personas llegan en tiempo real.

## APIs y documentos

- **Aguakan**: `GET https://www2.aguakan.com/wp-json/wp/v2/posts?categories=7` (sin autenticación, CORS habilitado). Los avisos se clasifican (corte, fuga, baja presión, obra, comunicado), se filtran por ciudad y se ubican de forma aproximada con un catálogo local de colonias/avenidas (`src/features/avisos/api.ts`). Caché local de 20 min.
- **Gobierno de Quintana Roo**: `GET https://qroo.gob.mx/wp-json/wp/v2/posts?search=…` (misma API WordPress, CORS habilitado). Se buscan «bacheo», «encharcamiento», «inundación», «pluvial», «repavimentación», «rehabilitación vial» y «cárcamo», y solo se conservan comunicados cuyo título trate de calles o drenaje y que mencionen Cancún/Benito Juárez. Son notas de prensa, no un registro completo de baches.
- **Open-Meteo**: lluvia de las últimas/próximas 24 h en Cancún para estimar riesgo de encharcamiento (sin API key).
- **Mapas de calor**: densidad de reportes (núcleo gaussiano de 750 m, más peso a reportes con más confirmaciones) y temperatura / sensación térmica de Open-Meteo en una rejilla de 6×6 puntos interpolada (IDW). Ambas se dibujan en un canvas como imagen sobre el mapa (`src/components/map/HeatLayers.tsx`).
- **Documentos**: GeoJSON (puntos, líneas o polígonos → centroide) y CSV (`categoria,titulo,descripcion,referencia,lat,lng,fecha`, separador `,` o `;`). Plantilla descargable en `#/datos`. Los registros importados entran como *Pendiente* con origen «externo».

## Recompensas

Puntos calculados a partir de los aportes (no se pueden duplicar): reporte +10, foto +5, corroboración +3, objeción +2, reporte propio corroborado +15, registro importado +2 (máx. 20). Cinco niveles (Vecino nuevo → Héroe de Cancún) y 10 insignias. Ver `src/features/rewards/rewards.ts`.

## Qué está simulado / qué requeriría backend

- Persistencia: `localStorage` en modo local, o Supabase si está configurado (ver arriba). La identidad es anónima por navegador: borrar datos del navegador crea una identidad nueva.
- Usuario: alias e identificador demo sin cuenta. La protección contra duplicados de confirmación es por navegador, no por persona.
- Moderación, antispam, notificaciones push y canalización a autoridades: no existen; las notificaciones del encabezado se derivan de los datos locales.
- Clima, ambiente y biodiversidad: solo descritos como extensiones futuras; no se muestran cifras simuladas.
- PWA: el service worker guarda la interfaz; **los mosaicos del mapa no se guardan sin conexión**. Para uso intensivo o comercial conviene una cuenta propia de mosaicos (Esri, MapTiler, Stadia, etc.), ya que los servidores gratuitos limitan ese uso. CARTO ya exige API key.
