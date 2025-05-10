#!/usr/bin/env node

// Script para inyectar variables de entorno en tiempo de construcción
const fs = require('fs');
const path = require('path');

// Ruta al archivo vercel-config.js después de la construcción
const configPath = path.join(__dirname, 'dist', 'vercel-config.js');

// Obtener variables de entorno
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Inyectando variables de entorno...');
console.log(`SUPABASE_URL: ${supabaseUrl ? 'Presente' : 'No definida'}`);
console.log(`SUPABASE_ANON_KEY: ${supabaseKey ? 'Presente' : 'No definida'}`);

// Crear contenido del archivo de configuración
const configContent = `// Generado automáticamente durante el despliegue
window.ENV = {
  SUPABASE_URL: "${supabaseUrl}",
  SUPABASE_ANON_KEY: "${supabaseKey}"
};`;

// Verificar si el directorio dist existe
if (!fs.existsSync(path.join(__dirname, 'dist'))) {
  fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
}

// Escribir el archivo
try {
  fs.writeFileSync(configPath, configContent, 'utf8');
  console.log('Variables de entorno inyectadas correctamente en:', configPath);
} catch (error) {
  console.error('Error al escribir el archivo de configuración:', error);
} 