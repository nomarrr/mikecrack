import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { supabase } from '../lib/supabase';
import { SelectChangeEvent } from '@mui/material';

// Constantes
const HORAS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', 
               '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

// Funciones auxiliares
const getToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface HorarioData {
  dia: string;
  hora: string;
  materia: string;
  grupo: string;
  aula?: string;
  edificio?: string;
  asistencia: 'pendiente' | 'presente' | 'ausente';
  horarioId?: number;
}

interface MateriaData {
  name: string;
}

interface GrupoData {
  name: string;
  classroom: string;
  building: string;
}

interface MaestroData {
  name: string;
}

interface HorarioRaw {
  id: number;
  hora: string;
  dia: string;
  materia: MateriaData;
  grupo: GrupoData;
  maestro: MaestroData;
}

const formatHora = (hora: string) => {
  return hora;
};

// Función auxiliar para obtener la hora actual en formato HH:00
const getCurrentHour = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:00`;
};

// Función auxiliar para verificar si la hora está en el rango de HORAS
const isValidHour = (hour: string) => {
  return HORAS.includes(hour);
};

// Modificar para manejar múltiples clases por hora
type HorarioMapValue = HorarioData[];

// Función auxiliar para obtener el día de la semana
const getDayName = (date: Date): string => {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dias[date.getDay()];
};

export default function ChecadorHorarioPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [horarioData, setHorarioData] = useState<Map<string, HorarioMapValue>>(new Map());
  const [horasNecesarias, setHorasNecesarias] = useState<string[]>(HORAS);
  const [diaActual, setDiaActual] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(getToday());
  // Inicializar con la hora actual si está en el rango de HORAS
  const [selectedHora, setSelectedHora] = useState<string>(() => {
    const currentHour = getCurrentHour();
    return isValidHour(currentHour) ? currentHour : '';
  });

  // Efecto para actualizar el día actual
  useEffect(() => {
    const selectedDateObj = new Date(selectedDate + 'T00:00:00');
    const diaSemana = getDayName(selectedDateObj);
    
    // Añadir logs para depuración
    console.log('Fecha seleccionada:', selectedDate);
    console.log('Día de la semana:', diaSemana);
    
    if (diaSemana === 'Domingo' || diaSemana === 'Sábado') {
      setError('No hay clases los fines de semana');
      return;
    }

    setDiaActual(diaSemana);
    cargarHorarios(diaSemana, selectedDate);
  }, [selectedDate, selectedHora]);

  const cargarHorarios = async (dia: string, fecha: string) => {
    try {
      setLoading(true);
      setError(null);

      // Debug: Imprimir el día que estamos consultando
      console.log('Consultando día:', dia);
      console.log('Fecha seleccionada:', fecha);

      let query = supabase
        .from('horario-maestro')
        .select(`
          id,
          hora,
          dia,
          materia:materias(name),
          grupo:grupo(name, classroom, building),
          maestro:usuarios(name)
        `)
        .eq('dia', dia);

      if (selectedHora) {
        query = query.eq('hora', selectedHora);
      }

      const { data: horarios, error: horariosError } = await query;

      if (horariosError) throw horariosError;

      // Debug: Imprimir los horarios encontrados
      console.log('Horarios encontrados:', horarios);
      console.log('Cantidad de horarios por hora:', horarios?.reduce((acc: Record<string, number>, h: any) => {
        acc[h.hora] = (acc[h.hora] || 0) + 1;
        return acc;
      }, {}));

      // Obtener las asistencias registradas
      const { data: asistencias, error: asistenciasError } = await supabase
        .from('asistencia_checador')
        .select('*')
        .eq('fecha', fecha)
        .in('horario_id', horarios?.map((h: any) => h.id) || []);

      if (asistenciasError) throw asistenciasError;

      const horarioMap = new Map<string, HorarioMapValue>();

      // Inicializar el mapa con las horas necesarias
      const horasAMostrar = selectedHora ? [selectedHora] : HORAS;
      horasAMostrar.forEach(hora => {
        const key = `${dia}-${hora}`;
        horarioMap.set(key, []);
      });

      // Procesar cada horario
      horarios?.forEach((horario: any) => {
        const asistenciaHoy = asistencias?.find((a: any) => a.horario_id === horario.id);
        const key = `${dia}-${horario.hora}`;
        
        // Debug: Imprimir cada horario que se está procesando
        console.log(`Procesando horario:`, {
          hora: horario.hora,
          materia: horario.materia?.name,
          grupo: horario.grupo?.name,
          maestro: horario.maestro?.name
        });

        const horarioItem: HorarioData = {
          dia: horario.dia,
          hora: horario.hora,
          materia: horario.materia?.name || '',
          grupo: `${horario.grupo?.name || ''} - ${horario.maestro?.name || ''}`,
          aula: horario.grupo?.classroom,
          edificio: horario.grupo?.building,
          asistencia: asistenciaHoy?.asistencia || 'pendiente',
          horarioId: horario.id
        };

        // Obtener el array existente y añadir el nuevo horario
        const horariosActuales = horarioMap.get(key) || [];
        horariosActuales.push(horarioItem);
        horarioMap.set(key, horariosActuales);
      });

      setHorarioData(horarioMap);
      
      // Actualizar las horas necesarias
      const horasConClases = Array.from(new Set(horarios?.map((h: any) => h.hora) || [])).sort();
      if (horasConClases.length > 0) {
        setHorasNecesarias(horasConClases);
      } else if (selectedHora) {
        setHorasNecesarias([selectedHora]);
      } else {
        setHorasNecesarias(HORAS);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error al cargar horarios:', err);
      setError(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  const handleToggleAsistencia = async (dia: string, hora: string, nuevoEstado: 'pendiente' | 'presente' | 'ausente', horarioId?: number) => {
    if (!horarioId) return;

    try {
      const { data: existingRecord, error: searchError } = await supabase
        .from('asistencia_checador')
        .select('*')
        .eq('horario_id', horarioId)
        .eq('fecha', selectedDate)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        throw searchError;
      }

      if (existingRecord) {
        const { error } = await supabase
          .from('asistencia_checador')
          .update({ asistencia: nuevoEstado })
          .eq('id', existingRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('asistencia_checador')
          .insert({
            horario_id: horarioId,
            fecha: selectedDate,
            asistencia: nuevoEstado
          });
        if (error) throw error;
      }

      // Actualizar el estado local
      const key = `${dia}-${hora}`;
      const horarios = horarioData.get(key) || [];
      const newHorarios = horarios.map(h =>
        h.horarioId === horarioId ? { ...h, asistencia: nuevoEstado } : h
      );
      
      const newHorarioData = new Map(horarioData);
      newHorarioData.set(key, newHorarios);
      setHorarioData(newHorarioData);
      
      setSuccess(`Asistencia actualizada a: ${nuevoEstado}`);
    } catch (error: any) {
      setError('Error al actualizar asistencia: ' + error.message);
    }
  };

  const handleCloseAlert = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom align="center">
        Control de Asistencia
      </Typography>

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', gap: 2, alignItems: 'center' }}>
        <TextField
          type="date"
          label="Seleccionar fecha"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          InputLabelProps={{
            shrink: true,
          }}
          inputProps={{
            max: getToday() // Restringe fechas futuras
          }}
          sx={{ width: 200 }}
        />
        <Button 
          variant="contained" 
          onClick={() => setSelectedDate(getToday())}
        >
          HOY
        </Button>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filtrar por hora</InputLabel>
          <Select
            value={selectedHora}
            onChange={(e) => setSelectedHora(e.target.value)}
            label="Filtrar por hora"
          >
            <MenuItem value="">Todas las horas</MenuItem>
            {HORAS.map((hora) => (
              <MenuItem key={hora} value={hora}>
                {formatHora(hora)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ maxWidth: '100%', overflow: 'auto' }}>
          {horasNecesarias.map((hora) => {
            const key = `${diaActual}-${hora}`;
            const horarios = horarioData.get(key) || [];
            
            if (horarios.length === 0) return null;

            return (
              <Box key={hora} sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  {formatHora(hora)}
                </Typography>
                {horarios.map((horario, index) => (
                  <TableContainer 
                    key={index} 
                    component={Paper} 
                    sx={{ 
                      mb: 2,
                      maxHeight: 'calc(100vh - 250px)',
                      border: '1px solid rgba(224, 224, 224, 1)'
                    }}
                  >
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell 
                            colSpan={2}
                            sx={{ 
                              fontWeight: 'bold', 
                              bgcolor: 'primary.main', 
                              color: 'white',
                              textAlign: 'center',
                              padding: '8px',
                              fontSize: '0.9rem'
                            }}
                          >
                            {horario.materia} - {horario.grupo}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ 
                            fontWeight: 'bold', 
                            width: '30%',
                            padding: '6px',
                            fontSize: '0.8rem'
                          }}>
                            Ubicación
                          </TableCell>
                          <TableCell sx={{ 
                            padding: '6px',
                            fontSize: '0.8rem'
                          }}>
                            {horario.aula && `Aula: ${horario.aula}`}
                            {horario.edificio && ` - Edificio: ${horario.edificio}`}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ 
                            fontWeight: 'bold',
                            padding: '6px',
                            fontSize: '0.8rem'
                          }}>
                            Estado
                          </TableCell>
                          <TableCell sx={{ 
                            padding: '6px',
                            fontSize: '0.8rem'
                          }}>
                            <Typography 
                              sx={{ 
                                color: horario.asistencia === 'presente' ? 'success.main' : 
                                      horario.asistencia === 'ausente' ? 'error.main' : 
                                      'warning.main',
                                fontWeight: 'bold',
                                fontSize: '0.8rem'
                              }}
                            >
                              {horario.asistencia.charAt(0).toUpperCase() + horario.asistencia.slice(1)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell colSpan={2} sx={{ padding: '6px' }}>
                            <Box sx={{ 
                              display: 'flex', 
                              gap: 1, 
                              justifyContent: 'center',
                              padding: '4px'
                            }}>
                              <Button
                                size="small"
                                variant={horario.asistencia === 'presente' ? "contained" : "outlined"}
                                onClick={() => handleToggleAsistencia(diaActual, hora, 'presente', horario.horarioId)}
                                color="success"
                                sx={{ 
                                  minWidth: '60px',
                                  textTransform: 'none',
                                  fontSize: '0.7rem',
                                  padding: '2px 4px',
                                  height: '24px'
                                }}
                              >
                                Presente
                              </Button>
                              <Button
                                size="small"
                                variant={horario.asistencia === 'ausente' ? "contained" : "outlined"}
                                onClick={() => handleToggleAsistencia(diaActual, hora, 'ausente', horario.horarioId)}
                                color="error"
                                sx={{ 
                                  minWidth: '60px',
                                  textTransform: 'none',
                                  fontSize: '0.7rem',
                                  padding: '2px 4px',
                                  height: '24px'
                                }}
                              >
                                Ausente
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                ))}
              </Box>
            );
          })}
        </Box>
      )}

      <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseAlert}>
        <Alert onClose={handleCloseAlert} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar open={!!success} autoHideDuration={6000} onClose={handleCloseAlert}>
        <Alert onClose={handleCloseAlert} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
} 