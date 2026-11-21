import 'leaflet/dist/leaflet.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css'
import './styles/index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)

// PWA: el service worker solo se registra al servir por http(s), no en el archivo único (file://).
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && import.meta.env.PROD && import.meta.env.MODE !== 'single') {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* sin PWA */ }) })
}
