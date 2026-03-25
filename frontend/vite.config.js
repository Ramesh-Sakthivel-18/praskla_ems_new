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
    ]
  }
})