# API de inundaciones

La API HTTP de `server/` consulta información de Cancún desde varias fuentes y expone JSON. Se ejecuta aparte del frontend; sus resultados todavía no se muestran como pines en la aplicación React.

## Arranque

```bash
npm run api
```

Puerto predeterminado: `8787`. Para cambiarlo, define `API_PORT` en el entorno antes de ejecutar el comando. La API usa módulos nativos de Node y no requiere clave. Las fuentes dinámicas requieren salida HTTPS.

## Rutas

| Método y ruta | Resultado |
|---|---|
| `GET /api/health` | Salud del proceso HTTP (`{"ok":true}`) |
| `GET /api/inundaciones/fuentes` | Identificadores, nombres, clases y sitios de las fuentes |
| `GET /api/inundaciones` | Eventos documentales y meteorología |

`GET /api/inundaciones` admite:

| Parámetro | Formato | Uso |
|---|---|---|
| `desde` | `AAAA-MM-DD` | Fecha mínima de los eventos, inclusiva |
| `hasta` | `AAAA-MM-DD` | Fecha máxima de los eventos, inclusiva |
| `fuente` | ID del catálogo | Filtra los eventos y el bloque meteorológico devuelto |
| `limite` | Entero de 1 a 100 | Máximo de eventos devueltos; predeterminado 50 |

Fechas imposibles, rangos invertidos, fuentes desconocidas y límites inválidos devuelven HTTP 400. Una ruta desconocida devuelve 404 y otro método 405. Se permite CORS de lectura desde cualquier origen.

Ejemplos:

```text
http://localhost:8787/api/inundaciones
http://localhost:8787/api/inundaciones?desde=2026-09-01&hasta=2026-10-31&limite=20
http://localhost:8787/api/inundaciones?fuente=municipio_benito_juarez
```

## Estructura de respuesta

```json
{
  "ciudad": "Cancún",
  "municipio": "Benito Juárez",
  "zonaHoraria": "America/Cancun",
  "generadoEn": "fecha ISO de la respuesta",
  "total": 4,
  "eventos": [
    {
      "id": "bj-2026-10-16",
      "fecha": "2026-10-16",
      "tipo": "encharcamiento",
      "titulo": "71 puntos con acumulación de agua atendidos",
      "descripcion": "Resumen del comunicado",
      "lugares": ["Nader", "Yaxchilán"],
      "lluviaReportadaMm": null,
      "puntosAtendidos": 71,
      "fuente": "municipio_benito_juarez",
      "url": "https://cancun.gob.mx/cancun/noticias/leer/4340",
      "precision": "ciudad_y_vialidades",
      "estado": "historico"
    }
  ],
  "meteorologia": {},
  "estadoFuentes": {},
  "nota": "Aclaración sobre el alcance de los datos"
}
```

El ejemplo está abreviado; `total` cuenta eventos antes de aplicar `limite`, y `eventos` contiene hasta ese máximo. `meteorologia.smn` trae `horas` con `horaLocal`, `precipitacionMm` y `probabilidadPct`; `meteorologia.openMeteo` incluye `periodo` (`pasado_modelado` o `pronostico`). Los horarios de SMN son cadenas del formato publicado por ese servicio (`AAAAMMDDTHH`); los de Open-Meteo usan `AAAA-MM-DDTHH:mm`. No se deben fusionar sin normalizarlos.

## Semántica y fallos

Los eventos municipales son históricos y se curan manualmente en `server/incidents.mjs`. Los resultados estatales tienen `tipo: comunicado` y `estado: comunicado_no_verificado_como_incidente`. Ninguno representa una calle inundada en este momento. La meteorología es contexto, no evidencia de inundación.

`estadoFuentes` informa disponibilidad, uso de caché, posible desactualización, hora de consulta y error por fuente. Si falla una fuente externa, la API sigue devolviendo las demás y los eventos municipales. Los comunicados estatales y Open-Meteo se guardan en memoria 20 minutos; el SMN, 60 minutos. Si una actualización falla, se puede servir la última respuesta exitosa con `desactualizado: true`. La caché se pierde al reiniciar. El SMN puede tardar varios segundos o agotar su tiempo de 20 segundos.

La API se probó con `npm run test:api`. Para mantener los datos históricos, edita el archivo de incidentes solo después de revisar los enlaces oficiales y añade una prueba si cambia el formato de respuesta.
