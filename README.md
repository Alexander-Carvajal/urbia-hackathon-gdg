# URBIA Cancún

Prototipo de inteligencia urbana colaborativa para explorar y reportar baches, falta de agua e inundaciones o encharcamientos en Cancún. Se desarrolló para una demostración de hackatón con React, TypeScript, Vite, Tailwind CSS y Leaflet.

> **Alcance de los datos:** los 16 reportes iniciales y sus corroboraciones son ficticios. Las personas pueden crear reportes reales, pero URBIA no los verifica oficialmente. Los avisos, la lluvia y la API de inundaciones conservan la procedencia de sus fuentes. La API HTTP es un proceso separado y todavía no alimenta los pines del mapa.

## Inicio rápido

Requiere Node.js **20.19+ o 22.12+** y npm. Desde la raíz del repositorio:

```bash
npm ci
npm run dev
```

Abre `http://localhost:5173`. Sin variables de entorno, los reportes se guardan en el `localStorage` de ese navegador. El mapa base, los avisos y el clima necesitan internet.

Puedes explorar sin iniciar sesión. Para publicar, importar, corroborar u objetar, usa `#/acceso` y elige un perfil ficticio. El botón «Continuar con Google» es una **simulación local**: no usa Google ni solicita credenciales. La sesión demo permanece en ese navegador hasta cerrar sesión.

Para iniciar también la API de inundaciones, abre otra terminal:

```bash
npm run api
```

Consulta `http://localhost:8787/api/inundaciones`. Puedes cambiar el puerto con `API_PORT`.

## Documentación

| Guía | Contenido |
|---|---|
| [Uso de la aplicación](docs/uso.md) | Pantallas, reportes, corroboración, importación y recompensas |
| [Arquitectura](docs/arquitectura.md) | Componentes, flujos de datos, estado y reglas |
| [Datos y fuentes](docs/datos-y-fuentes.md) | Procedencia, clasificación, precisión y límites de los datos |
| [API de inundaciones](docs/api-inundaciones.md) | Rutas, parámetros, respuesta y operación |
| [Supabase](docs/supabase.md) | Configuración, tablas, seguridad y modo compartido |
| [Despliegue](docs/despliegue.md) | Compilación, hosting, PWA y solución de problemas |
| [Desarrollo](docs/desarrollo.md) | Estructura, comandos, pruebas y criterios para cambios |

## Funciones principales

- Mapa y listado de reportes con búsqueda, filtros y detalle.
- Asistente de cuatro pasos para publicar reportes con ubicación y foto opcional.
- Corroboraciones, objeciones, historial y conexiones por proximidad y tiempo.
- Avisos de Aguakan y del Gobierno de Quintana Roo, además de lluvia de Open-Meteo.
- Importación y exportación de CSV y GeoJSON.
- Modo local o base compartida con Supabase; interfaz instalable como PWA.
- Acceso demo opcional para explorar y requerido en la interfaz para participar.
- API HTTP independiente con eventos históricos documentados y contexto meteorológico.

## Comandos

| Comando | Resultado |
|---|---|
| `npm run dev` | Servidor web de desarrollo en `localhost:5173` |
| `npm run build` | Compilación web en `dist/` |
| `npm run preview` | Vista previa de `dist/` en `localhost:4173` |
| `npm run build:single` | HTML autocontenido en `dist-single/` |
| `npm run typecheck` | Comprobación de tipos |
| `npm run api` | API HTTP en el puerto 8787 |
| `npm run test:auth` | Pruebas de sesión demo, retorno y UID anónimo |
| `npm run test:api` | Pruebas de adaptadores y rutas de la API |
| `npm run seed:sql` | Regenera `supabase/seed.sql` con fechas recientes |

## Estado del prototipo

El modo local sirve para explorar la demostración, pero sus datos no se comparten entre navegadores. Supabase permite compartir reportes y corroboraciones después de configurar un proyecto propio. No hay moderación operativa, protección antispam, notificaciones push ni integración con servicios de emergencia. Consulta [datos y fuentes](docs/datos-y-fuentes.md) antes de interpretar cualquier cifra o ubicación.
