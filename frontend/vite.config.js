import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // listen on 0.0.0.0 so both IPv4 and IPv6 work
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'https://5qyhme7fmg.execute-api.ap-southeast-1.amazonaws.com/dev',
        changeOrigin: true,
        rewrite: (path) => path, // keep /api prefix
        secure: true,
      },
    },
  },
})
