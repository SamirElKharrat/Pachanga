import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  // En producción el cliente y la API comparten origen, así que `/api` relativo
  // (services/api.js) funciona solo. En desarrollo no: el cliente vive en :5173 y
  // la API en :3001, y sin este proxy Vite se come `/api/...` y devuelve el HTML
  // de la aplicación — que es exactamente por qué dejó de poder iniciarse sesión.
  // Esto solo afecta a `npm run dev`; el build no lo usa.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'static'
  }
})