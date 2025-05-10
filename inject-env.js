#!/usr/bin/env node

// Script para inyectar variables de entorno en tiempo de construcción
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta al archivo vercel-config.js después de la construcción
const configPath = path.join(__dirname, 'dist', 'vercel-config.js');

// Obtener variables de entorno
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

console.log('=============================================');
console.log('INYECTANDO VARIABLES DE ENTORNO');
console.log('=============================================');
console.log(`SUPABASE_URL: ${supabaseUrl ? supabaseUrl.substring(0, 10) + '...' : 'NO DEFINIDA'}`);
console.log(`SUPABASE_ANON_KEY: ${supabaseKey ? supabaseKey.substring(0, 5) + '...' : 'NO DEFINIDA'}`);

// Añadir un marcador para saber si las variables están definidas realmente
const isProduction = process.env.NODE_ENV === 'production';
const isMissingVariables = !supabaseUrl || !supabaseKey;

// Crear contenido del archivo de configuración
const configContent = `// Generado automáticamente durante el despliegue - ${new Date().toISOString()}
window.ENV = {
  SUPABASE_URL: "${supabaseUrl}",
  SUPABASE_ANON_KEY: "${supabaseKey}",
  IS_MISSING_VARIABLES: ${isMissingVariables},
  IS_PRODUCTION: ${isProduction}
};

// Si estamos en producción y faltan variables, mostrar error en la consola
if (${isProduction} && ${isMissingVariables}) {
  console.error('ERROR CRÍTICO: Variables de entorno no configuradas en Vercel');
  console.error('Debes configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel > Settings > Environment Variables');
}`;

// Verificar si el directorio dist existe
if (!fs.existsSync(path.join(__dirname, 'dist'))) {
  fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
}

// Escribir el archivo
try {
  fs.writeFileSync(configPath, configContent, 'utf8');
  console.log('Variables de entorno inyectadas correctamente en:', configPath);
  
  if (isMissingVariables) {
    console.warn('⚠️ ADVERTENCIA: Faltan variables de entorno importantes!');
    console.warn('La aplicación no funcionará correctamente sin ellas.');
    if (isProduction) {
      console.error('🚨 ERROR: En producción, debes configurar las variables en Vercel:');
      console.error('   1. Ve a https://vercel.com');
      console.error('   2. Selecciona tu proyecto');
      console.error('   3. Ve a Settings > Environment Variables');
      console.error('   4. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
    } else {
      console.warn('Para desarrollo local, crea un archivo .env.local con estas variables.');
    }
  }
} catch (error) {
  console.error('Error al escribir el archivo de configuración:', error);
} 