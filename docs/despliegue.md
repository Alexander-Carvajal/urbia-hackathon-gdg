# Despliegue y operación

## Web estática

```bash
npm ci
npm run build
npm run preview
```

`dist/` contiene la web compilada, el manifest y el service worker. Se puede servir desde un hosting estático, incluso bajo una subruta, porque Vite usa `base: './'` y React usa `HashRouter`. Las rutas de página viven después de `#`, por ejemplo `/#/mapa`.

`npm run build:single` crea `dist-single/index.html` como archivo autocontenido para demostración. Se puede abrir directamente, pero las solicitudes a mapas, avisos y clima siguen necesitando internet. El service worker solo se registra para la compilación web normal servida por HTTP(S), no para `file://` ni para el modo single.

## API HTTP

La API necesita un proceso Node activo; **no se despliega al copiar `dist/`**. Ejecuta `npm run api` en un servidor con salida HTTPS hacia las fuentes externas y expón el puerto configurado con `API_PORT` mediante tu proxy o plataforma. Comprueba `/api/health` para verificar el proceso y `/api/inundaciones` para verificar las fuentes. El estado de cada fuente aparece en `estadoFuentes`.

La web actual consulta proveedores externos directamente y no requiere la API para funcionar. Si más adelante se conecta el frontend a la API, configura una URL pública o un proxy y documenta el origen permitido y la política de caché.

## Red y PWA

El mapa base usa mosaicos Esri World Street Map con atribución visible a Esri y OpenStreetMap. Debe haber acceso a ese servicio; revisa sus condiciones antes de tráfico intensivo o comercial. Aguakan, el Gobierno de Quintana Roo y Open-Meteo se consultan desde el navegador. La API consulta además SMN desde el servidor. Las caídas o cambios de formato de terceros pueden causar fallos parciales.

El service worker guarda la interfaz y recursos del mismo origen conforme se visitan. No guarda los mosaicos de terceros ni garantiza disponibilidad de avisos o clima sin conexión. Después de desplegar una versión nueva, la caché anterior se reemplaza durante la activación del nuevo service worker.

## Diagnóstico rápido

| Síntoma | Comprobación |
|---|---|
| Mapa sin fondo | Revisa conexión, bloqueadores y respuesta del proveedor de mosaicos |
| Avisos vacíos o antiguos | Usa «Actualizar» y revisa errores parciales de Aguakan o Q. Roo |
| Clima sin datos | Comprueba la respuesta de Open-Meteo y la conexión del navegador |
| Supabase muestra error | Comprueba URL, clave pública, Auth anónima y ejecución de `schema.sql` |
| Reporte no aparece en otros navegadores | Confirma que ambos usan el mismo proyecto Supabase; en modo local no se comparte |
| API devuelve una fuente no disponible | Inspecciona `estadoFuentes`; SMN puede tardar o agotar el tiempo |
| PWA no se instala | Usa HTTPS o localhost y la compilación normal; el HTML single no registra service worker |
