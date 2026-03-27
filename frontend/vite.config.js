import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    port: 5173,
    allowedHosts: [
      'ellis-bradytelic-factiously.ngrok-free.dev',
      'ems.prasklatechnology.com'
    ],
    // Add this proxy section!
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // Points to your Node server.js
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})