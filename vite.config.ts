import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: '.', // Alles staat in de hoofdmap
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: true
  }
})