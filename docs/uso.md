# Uso de la aplicación

La interfaz está en español y utiliza rutas con `#`. En una instalación local, abre `http://localhost:5173/#/`.

## Pantallas

| Ruta | Función |
|---|---|
| `#/` | Resumen, métricas calculadas, mapa y una conexión destacada |
| `#/mapa` | Mapa de reportes, filtros, búsqueda y capas `?capa=densidad` o `?capa=temperatura` |
| `#/reportes` | Lista, búsqueda, orden y filtros por estado |
| `#/reportes/:id` | Detalle, evidencia, corroboraciones, objeciones e historial |
| `#/reportar` | Asistente para crear un reporte |
| `#/analisis` | Conexiones espaciales y temporales; otras áreas se presentan como futuras |
| `#/avisos` | Avisos externos y pronóstico de lluvia |
| `#/datos` | Importación y exportación CSV/GeoJSON |
| `#/perfil` | Alias demo, puntos, niveles, insignias y restablecimiento local |

## Reportar

El asistente recoge categoría, descripción, ubicación dentro del área cubierta de Cancún y una foto opcional. Acepta JPG, PNG o WebP de hasta 5 MB. La foto se redimensiona a un máximo de 1280 px por lado y se vuelve a codificar como JPEG para retirar metadatos EXIF. El nuevo reporte empieza en **Pendiente** y se identifica como aporte ciudadano, sin verificación oficial.

En modo local se guarda solo en el navegador. En modo Supabase se envía a la base compartida; si la escritura falla, la interfaz muestra un aviso y vuelve a sincronizar. Para evitar pérdida de trabajo, comprueba el estado de conexión antes de usarlo en una demostración pública.

## Corroborar y objetar

Una persona puede confirmar una vez cada reporte ajeno que siga activo. Con dos confirmaciones, el estado pasa a **En revisión comunitaria**. Con cinco confirmaciones y al menos una evidencia, pasa a **Corroborado por vecinos**. La corroboración no equivale a validación municipal. La objeción registra un motivo y comentario para revisión; no elimina el reporte.

Los reportes de la semilla pueden incluir confirmaciones y evidencias simuladas. Los estados **Resuelto (declarado)** y **Descartado** de la semilla tienen motivo e historial, pero no prueban una actuación oficial.

## Importar y exportar

En `#/datos`, descarga la plantilla o sube un CSV con encabezados como:

```csv
categoria,titulo,descripcion,referencia,lat,lng,fecha
inundacion,Calle encharcada,Agua acumulada tras la lluvia,SM 64 calle 12,21.1569,-86.8352,2026-11-19
```

También se acepta GeoJSON `FeatureCollection` o una `Feature` individual con `Point`, `LineString`, `Polygon` o `MultiPoint`. Las geometrías que no son puntos se reducen a un centroide simple; se pierde el contorno original. El archivo puede medir hasta 5 MB y se importan como máximo 500 registros válidos por operación. Los puntos fuera del rectángulo aproximado de Cancún o sin categoría reconocible se omiten y se muestran para revisión. Los importados quedan **Pendientes** con origen `externo`.

La exportación produce CSV o GeoJSON de todos los reportes visibles para el navegador, o de una categoría. No incluye fotos ni identificadores de usuario. Si el modo local contiene la semilla, la exportación también contendrá datos ficticios: revisa `isDemoSeed` en el modelo antes de reutilizarlos como datos reales.

## Perfil y recompensas

Los puntos se calculan desde las acciones guardadas: reporte +10, foto +5, confirmación +3, objeción +2, reporte propio corroborado +15 e importación +2 por registro (máximo 20). Hay cinco niveles e insignias de progreso. El perfil es una función de participación del prototipo, no un sistema de identidad verificada.
