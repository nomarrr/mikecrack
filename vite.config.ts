import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno según el modo (development, production, etc.)
  const env = loadEnv(mode, process.cwd(), '')
  
  // Valores por defecto para compilación en caso de que falten variables
  const supabaseUrl = env.VITE_SUPABASE_URL || 'https://placeholder-supabase-url.supabase.co'
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY || 'placeholder-key-for-development-only'
  
  return {
    plugins: [react()],
    base: '', // Usar ruta relativa vacía para assets
    define: {
      // Hacer que las variables de entorno estén disponibles en runtime
      // Usar JSON.stringify para asegurar que se pasen como strings
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
    },
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
      assetsDir: 'assets',
      sourcemap: mode === 'development',
      assetsInlineLimit: 4096,
      cssCodeSplit: true,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            mui: ['@mui/material', '@mui/icons-material'],
            supabase: ['@supabase/supabase-js'],
          },
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]',
        },
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
        'react',
        'react-dom',
        'react-router-dom',
        '@emotion/react', 
        '@emotion/styled', 
        '@mui/material', 
        '@mui/icons-material',
        '@mui/x-date-pickers',
        '@supabase/supabase-js'
      ]
    },
    // Copiar archivos estáticos adicionales a la carpeta dist
    publicDir: 'public',
  }
})
