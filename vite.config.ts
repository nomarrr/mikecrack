import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Usar ruta relativa para los assets
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    assetsInlineLimit: 4096, // Limitar el tamaño de inlining para evitar problemas
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
        },
      },
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
