# Datos y fuentes

URBIA mezcla datos de demostración, aportes de personas, comunicados públicos y modelos meteorológicos. La procedencia determina cómo debe interpretarse cada elemento.

| Conjunto | Origen | Actualización | Qué permite afirmar |
|---|---|---|---|
| Reportes iniciales | `src/data/seed.ts` y, opcionalmente, `supabase/seed.sql` | Se generan al primer uso o al regenerar SQL | Solo demuestran la interfaz; **son ficticios** |
| Reportes nuevos | Personas usuarias o archivos importados | Al publicar | Observación pendiente de corroboración comunitaria |
| Avisos Aguakan | [WordPress REST de Aguakan](https://www2.aguakan.com/wp-json/wp/v2/posts) | Consulta web, caché local de 20 min | Comunicados del operador sobre agua y obras |
| Avisos estatales | [Gobierno de Quintana Roo](https://qroo.gob.mx/) | Consulta web, caché local de 20 min | Comunicados de prensa filtrados para Cancún |
| Lluvia en la web | [Open-Meteo](https://open-meteo.com/en/docs) | Consulta desde el navegador | Estimación y pronóstico de un modelo, no aforo de calle |
| Eventos de la API | [Comunicados municipales](https://cancun.gob.mx/) seleccionados | Curación manual en `server/incidents.mjs` | Hechos históricos descritos por el municipio |
| Datos dinámicos de la API | Gobierno estatal, [SMN](https://smn.conagua.gob.mx/es/web-service-api) y Open-Meteo | Caché en memoria por fuente | Comunicados y contexto meteorológico, etiquetados por tipo |

## Ubicaciones y precisión

La semilla usa coordenadas plausibles pero ilustrativas. Las zonas de `src/data/zones.ts` son puntos generales. El formulario y la importación aceptan coordenadas dentro del rectángulo aproximado `20.95 < lat < 21.3` y `-87.05 < lng < -86.7`; ese límite no es una delimitación administrativa exacta. Los avisos pueden asociarse a avenidas o colonias mediante un catálogo local: esos puntos son aproximados. Los eventos municipales de la API conservan nombres de lugares, **sin coordenadas inventadas**.

## Reglas de interpretación

- `corroborado` significa que se alcanzó una regla comunitaria; no es una certificación de autoridad.
- Un aviso sobre una obra pluvial o prevención no confirma que exista una inundación activa. La API etiqueta las notas estatales como `comunicado_no_verificado_como_incidente`.
- `lluviaReportadaMm` en eventos municipales es la cifra incluida en el comunicado y puede representar promedio o acumulado de ciudad según el texto original. No se compara directamente con una celda horaria de modelo.
- El riesgo de encharcamiento mostrado en la web es una heurística de lluvia de `src/features/avisos/api.ts`, no un pronóstico oficial de inundación.
- No se debe mezclar la semilla ficticia con datos reales al publicar estadísticas externas.

## Comunicados municipales incluidos

- [16 de octubre de 2026](https://cancun.gob.mx/cancun/noticias/leer/4340): 71 puntos con acumulación de agua atendidos.
- [3 de octubre de 2026](https://web.cancun.gob.mx/cancun/noticias/leer/4299): operativo tras lluvia acumulada aproximada de 120 mm.
- [29 de septiembre de 2026](https://cancun.gob.mx/cancun/noticias/leer/4288): encharcamientos y cierres viales; 89 mm de lluvia promedio según el municipio.
- [13 de diciembre de 2025](https://cancun.gob.mx/cancun/noticias/leer/3313): atención de bomberos a reportes del C5.

Esta selección no pretende ser un historial exhaustivo. Para agregar otro evento, verifica el comunicado original, registra su URL y fecha y describe solo los lugares y valores que el texto sustenta.
