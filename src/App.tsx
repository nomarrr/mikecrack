import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Box, ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { es } from 'date-fns/locale'

// Components
import Login from './components/Login'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'
import AdminDashboard from './components/AdminDashboard'
import TemarioPage from './components/TemarioPage'
import UsuariosPage from './components/UsuariosPage'
import GruposPage from './components/GruposPage'
import HorarioPage from './components/HorarioPage'
import MateriasPage from './components/MateriasPage'
import CarrerasPage from './components/CarrerasPage'
import HorariosPage from './components/HorariosPage'
import JefeHorarioPage from './components/JefeHorarioPage'
import ChecadorHorarioPage from './components/ChecadorHorarioPage'
import JefeLayout from './components/JefeLayout'
import BuscarMaestroPage from './components/BuscarMaestroPage'
import MaestroLayout from './layouts/MaestroLayout'
import MaestroHorarioPage from './components/MaestroHorarioPage'
import ChecadorLayout from './components/ChecadorLayout'
import AlumnoLayout from './components/AlumnoLayout'
import AlumnoHorarioPage from './components/AlumnoHorarioPage'
import EdificiosPage from './components/EdificiosPage'
import ConsultaAsistenciasPage from './components/ConsultaAsistenciasPage'
import './App.css'

// Crear un tema personalizado
const theme = createTheme({
  palette: {
    primary: {
      main: '#4285F4',
    },
    secondary: {
      main: '#454646',
    },
    background: {
      default: '#F2F3F8',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// Componente para mostrar cuando hay un error
const ErrorComponent = () => (
  <Box 
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: 3,
      textAlign: 'center'
    }}
  >
    <h1>Error en la aplicación</h1>
    <p>Se ha producido un error al cargar la aplicación. Puede ser debido a:</p>
    <ul style={{ textAlign: 'left' }}>
      <li>Problemas de conexión con la base de datos</li>
      <li>Falta de configuración de variables de entorno</li>
      <li>Problemas con el enrutamiento</li>
    </ul>
    <p>Por favor, intenta recargar la página o contacta al administrador.</p>
    <button 
      onClick={() => window.location.reload()} 
      style={{ 
        padding: '10px 20px', 
        background: '#4285F4', 
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginTop: '20px'
      }}
    >
      Recargar página
    </button>
  </Box>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
        <CssBaseline />
        <Box className="app-container">
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                {/* Mostrar Login tanto en / como en /login */}
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/error" element={<ErrorComponent />} />
                
                {/* Rutas protegidas */}
                <Route element={<ProtectedRoute />}>
                  {/* Rutas de Administrador */}
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="horario" element={<HorarioPage />} />
                    <Route path="horarios" element={<HorariosPage />} />
                    <Route path="grupos" element={<GruposPage />} />
                    <Route path="usuarios" element={<UsuariosPage />} />
                    <Route path="materias" element={<MateriasPage />} />
                    <Route path="carreras" element={<CarrerasPage />} />
                    <Route path="temarios" element={<TemarioPage />} />
                    <Route path="checador-horario" element={<ChecadorHorarioPage />} />
                    <Route path="edificios" element={<EdificiosPage />} />
                    <Route path="consulta-asistencias" element={<ConsultaAsistenciasPage />} />
                  </Route>

                  {/* Rutas de Alumno */}
                  <Route path="/alumno" element={<AlumnoLayout />}>
                    <Route index element={<AlumnoHorarioPage />} />
                    <Route path="horario" element={<AlumnoHorarioPage />} />
                  </Route>

                  {/* Rutas de Jefe de Grupo */}
                  <Route path="/jefe" element={<JefeLayout />}>
                    <Route index element={<JefeHorarioPage />} />
                    <Route path="horario" element={<JefeHorarioPage />} />
                    <Route path="buscar" element={<BuscarMaestroPage />} />
                  </Route>

                  {/* Rutas de Checador */}
                  <Route path="/checador" element={<ChecadorLayout />}>
                    <Route index element={<ChecadorHorarioPage />} />
                    <Route path="horario" element={<ChecadorHorarioPage />} />
                  </Route>

                  {/* Rutas de Maestro */}
                  <Route path="/maestro" element={<MaestroLayout />}>
                    <Route index element={<MaestroHorarioPage />} />
                    <Route path="horario" element={<MaestroHorarioPage />} />
                  </Route>
                </Route>
                
                {/* Catch-all route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </Box>
      </LocalizationProvider>
    </ThemeProvider>
  )
}

export default App
