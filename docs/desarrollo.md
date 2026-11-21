# Desarrollo y mantenimiento

## Preparación

Usa Node.js 20.19+ o 22.12+ y `npm ci`. Los scripts están en `package.json`. La web se implementa en TypeScript; la API HTTP usa módulos `.mjs` de Node sin dependencias adicionales. Mantén separadas las etiquetas de datos demo, aportes ciudadanos, comunicados y pronósticos.

## Verificación

```bash
npm run typecheck
npm run test:api
npm run build
```

Las pruebas de la API usan respuestas simuladas para verificar filtrado, normalización, parámetros y comportamiento cuando falla una fuente. No sustituyen una comprobación periódica con los endpoints externos reales, que pueden cambiar. El build incluye la comprobación de tipos y genera `dist/`.

## Dónde cambiar cada cosa

| Cambio | Archivos principales |
|---|---|
| Rutas o navegación | `src/app/App.tsx`, `src/app/Layout.tsx` |
| Categorías, estados y umbrales | `src/data/categories.ts`, `src/lib/rules.ts`, `supabase/schema.sql` |
| Reportes y persistencia | `src/features/reports/store.tsx`, `src/lib/storage.ts`, `src/lib/supabase.ts` |
| Avisos o lluvia de la web | `src/features/avisos/api.ts`, `src/features/avisos/AvisosProvider.tsx` |
| Importación y exportación | `src/lib/documents.ts`, `src/features/datos/DatosPage.tsx` |
| Conexiones | `src/features/connections/detect.ts` |
| Eventos históricos de la API | `server/incidents.mjs` |
| Adaptadores y contrato HTTP | `server/sources.mjs`, `server/app.mjs`, `server/api.test.mjs` |

Si cambias los umbrales de corroboración, actualiza la regla del navegador y la función SQL para evitar resultados distintos entre modo local y compartido. Si cambias las columnas de reportes, actualiza el tipo `Report`, el mapeo de Supabase, importación/exportación y la documentación.

## Incorporar una fuente o un incidente

1. Comprueba que la fuente es identificable y enlaza el documento o endpoint original.
2. Distingue un hecho histórico, una observación ciudadana y un pronóstico. No conviertas lluvia o una nota preventiva en un reporte de inundación activa.
3. Conserva fecha, zona horaria, unidades y precisión espacial. Deja `null` cuando el dato no aparece.
4. Añade manejo de errores y una prueba con una respuesta representativa.
5. Actualiza [datos y fuentes](datos-y-fuentes.md) y, si cambia el JSON, [API de inundaciones](api-inundaciones.md).

La semilla de `src/data/seed.ts` y `supabase/seed.sql` debe seguir claramente marcada como ficticia. Las exportaciones pueden contener esa semilla; no las publiques como estadísticas de la ciudad.
