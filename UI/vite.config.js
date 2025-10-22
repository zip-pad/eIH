import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  base: '/',
  server: {
    port: 8000,
    host: true,
    strictPort: false,
    open: false,
    cors: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        landing: 'landing.html'
      }
    }
  },
  envPrefix: 'VITE_',
  optimizeDeps: {
    include: ['@supabase/supabase-js']
  }
})

