import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/v1': {
        target: 'https://qdpszufiwgweniwjdolu.supabase.co/functions/v1/developer-api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1/, '') || '/',
      },
    },
  },
})
