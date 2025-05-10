import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      onwarn(warning, warn) {
        // Ignorar advertencias específicas que no impiden la compilación
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' || 
            warning.code === 'THIS_IS_UNDEFINED' ||
            warning.message.includes('Use of eval')) {
          return;
        }
        warn(warning);
      }
    }
  },
  optimizeDeps: {
    include: [
      '@emotion/react', 
      '@emotion/styled', 
      '@mui/material', 
      '@mui/icons-material',
      '@mui/x-date-pickers'
    ]
  }
})
