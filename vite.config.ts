import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Genereer een unieke tijdstempel tijdens het bouwen
const timestamp = Date.now();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: '.', // Alles staat in de hoofdmap
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Forceert de browser om bij een update ALTIJD de nieuwe versie te downloaden
        entryFileNames: `assets/[name]-[hash]-v${timestamp}.js`,
        chunkFileNames: `assets/[name]-[hash]-v${timestamp}.js`,
        assetFileNames: `assets/[name]-[hash]-v${timestamp}.[ext]`
      }
    }
  },
  server: {
    host: true
  }
})
