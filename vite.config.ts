import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build`         → build normal en dist/ (para hosting, PWA)
// `npm run build:single`  → un único archivo HTML autocontenido en dist-single/
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), tailwindcss(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  build: { chunkSizeWarningLimit: 900, ...(mode === 'single' ? { outDir: 'dist-single', assetsInlineLimit: 100000000 } : { outDir: 'dist' }) },
}))
