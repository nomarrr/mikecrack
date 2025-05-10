# Sistema de Checado - Aplicación React con TypeScript

Esta aplicación utiliza React, TypeScript, MUI y Supabase para implementar un sistema de registro de asistencia.

## Variables de entorno necesarias

Para que la aplicación funcione correctamente, es necesario configurar las siguientes variables de entorno:

**Localmente**: Crea un archivo `.env.local` en la raíz del proyecto.
**En Vercel**: Configura estas variables en la sección Settings > Environment Variables.

```
# Datos de conexión a Supabase
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-aqui
```

### Cómo obtener las credenciales de Supabase

1. Inicia sesión en tu cuenta de [Supabase](https://supabase.com)
2. Selecciona tu proyecto
3. Ve a Settings > API
4. Copia la URL del proyecto y la anon key (clave anónima)

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

## Despliegue en Vercel

La aplicación está configurada para desplegarse automáticamente en Vercel. Asegúrate de:

1. Conectar tu repositorio de GitHub a Vercel
2. Configurar las variables de entorno mencionadas arriba en la interfaz de Vercel
3. Utiliza la siguiente configuración:
   - Framework Preset: Vite
   - Build Command: npm run build
   - Output Directory: dist

## Estructura de la aplicación

- `/src/components` - Componentes React
- `/src/contexts` - Contextos de React, incluido AuthContext
- `/src/lib` - Configuración de bibliotecas, como Supabase
- `/src/layouts` - Layouts reutilizables
- `/public` - Archivos estáticos

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
