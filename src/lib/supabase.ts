import { createClient } from '@supabase/supabase-js'

// Intenta obtener las variables de ambiente de diferentes fuentes
// para máxima compatibilidad con diferentes entornos
const getEnvVariable = (name: string) => {
  // Intenta primero desde import.meta.env (Vite)
  if (import.meta.env && import.meta.env[name]) {
    return import.meta.env[name];
  }
  
  // Luego intenta desde process.env (Node.js / SSR)
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name];
  }
  
  // Intenta acceder directamente desde window si está disponible (último recurso)
  if (typeof window !== 'undefined' && (window as any)[name]) {
    return (window as any)[name];
  }
  
  // Si llegamos aquí, variable no encontrada
  return '';
}

// Obtener las variables de configuración
const supabaseUrl = getEnvVariable('VITE_SUPABASE_URL') || '';
const supabaseAnonKey = getEnvVariable('VITE_SUPABASE_ANON_KEY') || '';

// Verificación más estricta con mejor manejo de errores
if (!supabaseUrl) {
  console.error('ERROR CRÍTICO: URL de Supabase no definida. La aplicación no funcionará correctamente.');
  // En desarrollo, proporcionar instrucciones útiles
  if (import.meta.env.DEV) {
    console.info('Para desarrollo local, crea un archivo .env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
  }
}

if (!supabaseAnonKey) {
  console.error('ERROR CRÍTICO: Clave anónima de Supabase no definida. La autenticación no funcionará correctamente.');
}

// Valores de respaldo para evitar errores en compilación/desarrollo
// NOTA: Estos valores deben ser reemplazados con los reales en producción
const fallbackUrl = 'https://placeholder-supabase-url.supabase.co';
const fallbackKey = 'placeholder-key-for-development-only';

// Crear cliente de Supabase con mejor manejo de errores
export const supabase = createClient(
  supabaseUrl || fallbackUrl,  // Usar fallback si la URL no está definida
  supabaseAnonKey || fallbackKey,  // Usar fallback si la clave no está definida
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  }
) 