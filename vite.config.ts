import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',  // <- Este cambio es importante para Vercel
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      onwarn(warning, warn) {
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
});
