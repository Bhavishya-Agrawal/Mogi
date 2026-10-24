import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const vercelBuild = Boolean(process.env.VERCEL)
const uploadLimit = vercelBuild ? 4 * 1024 * 1024 : null

// The dev server proxies /api to the Express server, so there are no CORS headaches locally.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_MAX_RESUME_BYTES': JSON.stringify(uploadLimit || 10 * 1024 * 1024),
    'import.meta.env.VITE_MAX_AUDIO_BYTES': JSON.stringify(uploadLimit || 25 * 1024 * 1024),
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
