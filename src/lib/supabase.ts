import { createClient } from '@supabase/supabase-js'

// Intenta obtener las variables de ambiente de diferentes fuentes
// para máxima compatibilidad con diferentes entornos
const getEnvVariable = (name: string) => {
  // Obtener desde window.ENV (nuestro objeto global de config)
  if (typeof window !== 'undefined' && window['ENV'] && window['ENV'][name.replace('VITE_', '')]) {
    console.log(`Variable ${name} encontrada en window.ENV`);
    return window['ENV'][name.replace('VITE_', '')];
  }

  // Intenta primero desde import.meta.env (Vite)
  if (import.meta.env && import.meta.env[name]) {
    console.log(`Variable ${name} encontrada en import.meta.env`);
    return import.meta.env[name];
  }
  
  // Luego intenta desde process.env (Node.js / SSR)
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    console.log(`Variable ${name} encontrada en process.env`);
    return process.env[name];
  }
  
  // Intenta acceder directamente desde window si está disponible (último recurso)
  if (typeof window !== 'undefined' && (window as any)[name]) {
    console.log(`Variable ${name} encontrada en window`);
    return (window as any)[name];
  }
  
  console.warn(`⚠️ Variable ${name} NO ENCONTRADA en ninguna fuente`);
  return '';
}

// Obtener las variables de configuración
const supabaseUrl = getEnvVariable('VITE_SUPABASE_URL') || '';
const supabaseAnonKey = getEnvVariable('VITE_SUPABASE_ANON_KEY') || '';

// Mostrar información de entorno para depuración
console.log('🔍 Información de entorno:');
console.log(`- URL de Supabase: ${supabaseUrl ? (supabaseUrl.substring(0, 8) + '...') : 'NO DEFINIDA'}`);
console.log(`- Clave anónima presente: ${supabaseAnonKey ? 'SÍ' : 'NO'}`);
console.log(`- Modo de ejecución: ${import.meta.env.MODE || 'desconocido'}`);
console.log(`- Es producción: ${import.meta.env.PROD ? 'SÍ' : 'NO'}`);
console.log(`- window.ENV presente: ${typeof window !== 'undefined' && window['ENV'] ? 'SÍ' : 'NO'}`);

// Verificar si estamos en navegador y añadir variable de depuración al window para facilitar diagnóstico
if (typeof window !== 'undefined') {
  (window as any).SUPABASE_DEBUG = {
    url: supabaseUrl ? `${supabaseUrl.substring(0, 10)}...` : 'NO DEFINIDA',
    keyPresent: supabaseAnonKey ? 'SÍ' : 'NO',
    mode: import.meta.env.MODE || 'desconocido',
    isProduction: import.meta.env.PROD ? 'SÍ' : 'NO',
    windowEnvPresent: window['ENV'] ? 'SÍ' : 'NO',
    checkTime: new Date().toISOString()
  };
}

// Verificación más estricta con mejor manejo de errores
if (!supabaseUrl) {
  console.error('ERROR CRÍTICO: URL de Supabase no definida. La aplicación no funcionará correctamente.');
  // En desarrollo, proporcionar instrucciones útiles
  if (import.meta.env.DEV) {
    console.info('Para desarrollo local, crea un archivo .env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
  } else {
    console.error('En producción, asegúrate de configurar las variables de entorno en Vercel o tu proveedor de hosting');
  }
}

if (!supabaseAnonKey) {
  console.error('ERROR CRÍTICO: Clave anónima de Supabase no definida. La autenticación no funcionará correctamente.');
}

// En producción, NO usar valores de respaldo
let supabaseUrlFinal = supabaseUrl;
let supabaseKeyFinal = supabaseAnonKey;

// Solo usar valores de respaldo en desarrollo
if (import.meta.env.DEV && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn('⚠️ Usando valores de respaldo para Supabase - SOLO PARA DESARROLLO');
  const fallbackUrl = 'https://placeholder-supabase-url.supabase.co';
  const fallbackKey = 'placeholder-key-for-development-only';
  
  supabaseUrlFinal = supabaseUrl || fallbackUrl;
  supabaseKeyFinal = supabaseAnonKey || fallbackKey;
}

// Función para crear cliente con manejo de errores
let supabaseInstance: any = null;
try {
  // Crear cliente de Supabase con mejor manejo de errores
  supabaseInstance = createClient(
    supabaseUrlFinal,
    supabaseKeyFinal,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    }
  );

  console.log('Cliente Supabase inicializado correctamente con URL:', supabaseUrlFinal.substring(0, 10) + '...');
} catch (error) {
  console.error('Error al inicializar cliente Supabase:', error);
  
  // Crear un cliente de respaldo con métodos que registran errores
  supabaseInstance = {
    from: () => ({
      select: () => Promise.resolve({ error: { message: 'Error de inicialización de Supabase. Revisa la consola.' }}),
      insert: () => Promise.resolve({ error: { message: 'Error de inicialización de Supabase. Revisa la consola.' }}),
      update: () => Promise.resolve({ error: { message: 'Error de inicialización de Supabase. Revisa la consola.' }}),
      delete: () => Promise.resolve({ error: { message: 'Error de inicialización de Supabase. Revisa la consola.' }}),
      eq: () => ({ single: () => Promise.resolve({ error: { message: 'Error de inicialización de Supabase. Revisa la consola.' }})})
    }),
    auth: {
      signIn: () => Promise.resolve({ error: { message: 'Error de inicialización de Supabase. Revisa la consola.' }}),
      signOut: () => Promise.resolve({ error: { message: 'Error de inicialización de Supabase. Revisa la consola.' }})
    }
  };
}

export const supabase = supabaseInstance; 