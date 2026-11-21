// Service worker mínimo: guarda la interfaz (app shell) para abrirla sin conexión.
// Los mosaicos del mapa de OpenStreetMap NO se guardan: sin internet el mapa base no carga.
const CACHE = 'urbia-shell-v1'
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg']))) })
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim() })
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return
  e.respondWith(fetch(e.request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))))
})

self.addEventListener('notificationclick', (event) => {
  if (!event.notification.data?.routeAlert) return
  event.notification.close()
  event.waitUntil((async () => {
    const url = new URL('./#/trayecto', self.registration.scope)
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const route = windows.find((client) => client.url === url.href)
    if (route) return route.focus()
    return self.clients.openWindow(url.href)
  })())
})
