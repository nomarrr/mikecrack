import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Box, 
  Button, 
  Container, 
  TextField, 
  Typography, 
  Link,
  Alert,
  Paper,
  Avatar,
  CircularProgress
} from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// Variable para depuración - mostrará información del entorno en el login
const DEBUG_MODE = true;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY_PRESENT = import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SÍ' : 'NO';
const ENV_MODE = import.meta.env.MODE || 'desconocido';
const IS_PROD = import.meta.env.PROD ? 'SÍ' : 'NO';

// Importar la imagen directamente si está en src/assets
// import logoImage from '../assets/vision2025.jpeg'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [imageLoaded, setImageLoaded] = useState(false)
  const navigate = useNavigate()
  const { signIn } = useAuth()

  // Cargar información de depuración
  useEffect(() => {
    if (DEBUG_MODE) {
      try {
        // Mostrar información detallada
        let info = '🔍 INFORMACIÓN DE DEPURACIÓN\n\n';
        info += `URL de Supabase: ${SUPABASE_URL || 'NO DEFINIDA'}\n`;
        info += `API Key presente: ${SUPABASE_KEY_PRESENT}\n`;
        info += `Modo: ${ENV_MODE}\n`;
        info += `Es producción: ${IS_PROD}\n\n`;
        
        // Función para actualizar la información de depuración
        const updateDebugInfo = (additionalInfo: string) => {
          setDebugInfo(info + additionalInfo);
        };
        
        // Intentar una consulta simple a Supabase para verificar la conexión
        try {
          supabase.from('usuarios').select('count', { count: 'exact', head: true })
            .then(({ count, error }) => {
              if (error) {
                updateDebugInfo(
                  `⚠️ Error de conexión: ${error.message || 'Desconocido'}\n` +
                  `Código: ${error.code || 'N/A'}\n` +
                  `Detalles: ${error.details || 'N/A'}\n`
                );
              } else {
                updateDebugInfo(`✅ Conexión exitosa. Usuarios: ${count || 'N/A'}\n`);
              }
            });
        } catch (queryError) {
          updateDebugInfo(`❌ Error al ejecutar consulta: ${queryError instanceof Error ? queryError.message : String(queryError)}\n`);
        }
      } catch(e) {
        setDebugInfo(`❌ Error al conectar: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }, []);

  // Verificar si el usuario ya está autenticado
  useEffect(() => {
    const checkAuth = () => {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const userData = JSON.parse(userStr)
          if (userData && userData.role) {
            // Redirigir según el rol
            const roleRoutes = {
              Administrador: '/admin/dashboard',
              Alumno: '/alumno/horario',
              Jefe_de_Grupo: '/jefe/horario',
              Checador: '/checador/horario',
              Maestro: '/maestro/horario'
            }
            navigate(roleRoutes[userData.role] || '/login')
          }
        } catch (e) {
          console.error('Error parsing user data', e)
        }
      }
    }
    
    checkAuth()
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Por favor ingrese email y contraseña')
      return
    }
    
    try {
      setLoading(true)
      setError(null)

      // Buscar usuario por email y password
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single()

      if (userError) {
        console.error('Error de Supabase:', userError);
        throw new Error('Credenciales inválidas')
      }
      
      if (!userData) {
        throw new Error('Usuario o contraseña incorrectos')
      }

      // Iniciar sesión en el contexto
      await signIn(userData)
      
      // Redirigir según el rol
      const roleRoutes: Record<string, string> = {
        Administrador: '/admin/dashboard',
        Alumno: '/alumno/horario',
        Jefe_de_Grupo: '/jefe/horario',
        Checador: '/checador/horario',
        Maestro: '/maestro/horario'
      }
      
      navigate(roleRoutes[userData.role] || '/login')
      
    } catch (err: any) {
      console.error('Error en login:', err)
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const handleImageError = () => {
    setImageLoaded(false)
  }

  return (
    <Box 
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        bgcolor: '#F2F3F8'
      }}
    >
      <Container component="main" maxWidth="xs">
        <Paper 
          elevation={3} 
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          
          <Typography component="h1" variant="h5" mb={2}>
            Checador Login
          </Typography>
          
          {/* Usar un enfoque simple sin imagen externa */}
          <Box 
            sx={{ 
              height: 110, 
              mb: 3,
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: 'primary.light',
              borderRadius: 1,
              color: 'white',
              fontWeight: 'bold'
            }}
          >
            <Typography variant="h6">
              Sistema de Checado
            </Typography>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Información de depuración */}
          {DEBUG_MODE && debugInfo && (
            <Alert severity="info" sx={{ width: '100%', mb: 2, whiteSpace: 'pre-line' }}>
              <Typography variant="body2">
                Información de depuración:
                {debugInfo}
              </Typography>
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Correo Electrónico"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Iniciar Sesión'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
} 