import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Snackbar,
  Alert,
  Button,
  TextField
} from '@mui/material';
import { supabase } from '../lib/supabase';
import {
  LocalizationProvider,
  DatePicker,
} from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { startOfWeek, endOfWeek, addDays, format, isWithinInterval } from 'date-fns';

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

interface HorarioResponse {
  id: number;
  hora: string;
  dia: string;
  materia: {
    name: string;
  };
  grupo: {
    name: string;
    classroom: string;
    building: string;
  };
}

interface DayProps {
  day: Date;
  selected: boolean;
  outsideCurrentMonth: boolean;
  sx?: any;
}

interface DayCalendarStateType {
  day: Date;
  selected: boolean;
  outsideCurrentMonth?: boolean;
  sx?: any;
}

const HORAS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', 
               '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

const formatHora = (hora: string) => {
  return `${hora} - ${parseInt(hora.split(':')[0]) + 1}:00`;
};

// Función para obtener el rango de horas necesarias
const getHorasNecesarias = (horarioMap: Map<string, HorarioData>): string[] => {
  let horasConClase = new Set<string>();
  
  // Recolectar todas las horas que tienen clases
  horarioMap.forEach((value) => {
    if (value.materia) {
      horasConClase.add(value.hora);
    }
  });

  // Convertir a array y ordenar
  const horasOrdenadas = Array.from(horasConClase).sort((a, b) => {
    return parseInt(a.split(':')[0]) - parseInt(b.split(':')[0]);
  });

  if (horasOrdenadas.length === 0) return HORAS;

  // Obtener la primera y última hora
  const primeraHora = parseInt(horasOrdenadas[0].split(':')[0]);
  const ultimaHora = parseInt(horasOrdenadas[horasOrdenadas.length - 1].split(':')[0]);

  // Crear array con el rango completo de horas
  return HORAS.filter(hora => {
    const horaActual = parseInt(hora.split(':')[0]);
    return horaActual >= primeraHora && horaActual <= ultimaHora;
  });
};

export default function MaestroHorarioPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [horarioData, setHorarioData] = useState<Map<string, HorarioData>>(new Map());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1, locale: es })
  );

  // Función para verificar si una fecha está en la semana actual
  const isDateInCurrentWeek = (date: Date) => {
    const start = currentWeekStart;
    const end = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return isWithinInterval(date, { start, end });
  };

  // Obtener el final de la semana actual
  const getCurrentWeekEnd = () => {
    return endOfWeek(new Date(), { weekStartsOn: 1 });
  };

  // Función para manejar el cambio de fecha
  const handleDateChange = (date: Date | null) => {
    if (date) {
      const weekStart = startOfWeek(date, { weekStartsOn: 1, locale: es });
      // Verificar si la semana seleccionada es futura
      if (weekStart > getCurrentWeekEnd()) {
        setError('No se pueden seleccionar fechas futuras');
        return;
      }
      
      setCurrentWeekStart(weekStart);
      setSelectedDate(date);
      
      // Usar la fecha seleccionada para cargar los horarios
      const fechaFormateada = format(date, 'yyyy-MM-dd');
      cargarHorarios(fechaFormateada);
    }
  };

  // Función para ir a la semana actual
  const handleCurrentWeek = () => {
    const today = new Date();
    handleDateChange(today);
  };

  const cargarHorarios = async (fecha: string) => {
    try {
      setLoading(true);
      const userString = localStorage.getItem('user');
      if (!userString) {
        throw new Error('No se encontró información del usuario');
      }
      const user = JSON.parse(userString);

      // Obtener todos los horarios del maestro
      const { data: horarios, error: horariosError } = await supabase
        .from('horario-maestro')
        .select(`
          id,
          hora,
          dia,
          materia:materias!inner(name),
          grupo:grupo!inner(name, classroom, building)
        `)
        .eq('maestro_id', user.id);

      if (horariosError) throw horariosError;

      // Calcular el rango de fechas para la semana
      const inicioSemana = format(currentWeekStart, 'yyyy-MM-dd');
      const finSemana = format(addDays(currentWeekStart, 4), 'yyyy-MM-dd'); // Cambiado a 4 para solo incluir hasta el viernes

      // Obtener las asistencias registradas para toda la semana
      const { data: asistencias, error: asistenciasError } = await supabase
        .from('asistencia_maestro')
        .select('*')
        .gte('fecha', inicioSemana)
        .lte('fecha', finSemana)
        .in('horario_id', horarios?.map(h => h.id) || []);

      if (asistenciasError) throw asistenciasError;

      const horarioMap = new Map<string, HorarioData>();

      // Inicializar el mapa para todos los días y horas
      DIAS.forEach(dia => {
        HORAS.forEach(hora => {
          const key = `${dia}-${hora}`;
          horarioMap.set(key, {
            dia,
            hora,
            materia: '',
            grupo: '',
            asistencia: 'pendiente'
          });
        });
      });

      // Llenar el mapa con los horarios reales
      const horariosTyped = horarios as unknown as HorarioResponse[];
      horariosTyped?.forEach(horario => {
        // Encontrar la asistencia para este horario en el día específico
        const fechaDia = format(
          addDays(
            currentWeekStart, 
            DIAS.indexOf(horario.dia)
          ), 
          'yyyy-MM-dd'
        );
        
        const asistenciaHoy = asistencias?.find(
          a => a.horario_id === horario.id && a.fecha === fechaDia
        );

        const key = `${horario.dia}-${horario.hora}`;

        horarioMap.set(key, {
          dia: horario.dia,
          hora: horario.hora,
          materia: horario.materia.name,
          grupo: horario.grupo.name,
          aula: horario.grupo.classroom,
          edificio: horario.grupo.building,
          asistencia: asistenciaHoy?.asistencia || 'pendiente',
          horarioId: horario.id
        });
      });

      setHorarioData(horarioMap);
    } catch (error: any) {
      console.error('Error completo:', error);
      setError('Error al cargar horario: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Efecto para cargar horarios cuando cambia la semana
  useEffect(() => {
    const fechaInicio = format(currentWeekStart, 'yyyy-MM-dd');
    cargarHorarios(fechaInicio);
  }, [currentWeekStart]);

  const handleToggleAsistencia = async (dia: string, hora: string, nuevoEstado: 'presente' | 'ausente') => {
    const key = `${dia}-${hora}`;
    const horario = horarioData.get(key);
    
    if (!horario?.horarioId) return;

    try {
      // Obtener la fecha del día específico de la semana
      const diaIndex = DIAS.indexOf(dia);
      const fechaDia = addDays(currentWeekStart, diaIndex);
      const fechaFormateada = format(fechaDia, 'yyyy-MM-dd');

      // Primero buscamos si ya existe un registro para esta fecha y horario
      const { data: existingRecord, error: searchError } = await supabase
        .from('asistencia_maestro')
        .select('*')
        .eq('horario_id', horario.horarioId)
        .eq('fecha', fechaFormateada)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        throw searchError;
      }

      let updateError;
      if (existingRecord) {
        // Si existe, actualizamos
        const { error } = await supabase
          .from('asistencia_maestro')
          .update({ asistencia: nuevoEstado })
          .eq('id', existingRecord.id);
        updateError = error;
      } else {
        // Si no existe, insertamos
        const { error } = await supabase
          .from('asistencia_maestro')
          .insert({
            horario_id: horario.horarioId,
            fecha: fechaFormateada,
            asistencia: nuevoEstado
          });
        updateError = error;
      }

      if (updateError) throw updateError;

      // Actualizar el estado local
      const newHorarioData = new Map(horarioData);
      newHorarioData.set(key, {
        ...horario,
        asistencia: nuevoEstado
      });
      
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
        Mi Horario
      </Typography>

      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        mb: 3,
        gap: 2
      }}>
        <Button 
          variant="outlined" 
          onClick={() => handleDateChange(addDays(currentWeekStart, -7))}
        >
          Semana Anterior
        </Button>

        <Button
          variant="contained"
          onClick={handleCurrentWeek}
          color="primary"
        >
          Semana Actual
        </Button>

        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <DatePicker
            label="Seleccionar fecha"
            value={selectedDate}
            onChange={handleDateChange}
            format="dd/MM/yyyy"
            maxDate={getCurrentWeekEnd()}
            sx={{ 
              minWidth: 200,
              '& .MuiInputBase-root': {
                backgroundColor: 'white'
              }
            }}
            slotProps={{
              day: (ownerState: DayCalendarStateType) => ({
                ...ownerState,
                sx: {
                  ...ownerState.sx,
                  backgroundColor: isDateInCurrentWeek(ownerState.day) ? 
                    'primary.light' : 
                    ownerState.outsideCurrentMonth ? 'grey.100' : 'inherit',
                  color: isDateInCurrentWeek(ownerState.day) ? 
                    'white' : 
                    ownerState.outsideCurrentMonth ? 'grey.500' : 'inherit',
                  '&:hover': {
                    backgroundColor: isDateInCurrentWeek(ownerState.day) ? 
                      'primary.main' : 
                      'grey.200'
                  }
                }
              })
            }}
          />
        </LocalizationProvider>

        <Button 
          variant="outlined" 
          onClick={() => handleDateChange(addDays(currentWeekStart, 7))}
        >
          Siguiente Semana
        </Button>
      </Box>

      <Typography variant="subtitle1" sx={{ textAlign: 'center', mb: 2 }}>
        Semana del {format(currentWeekStart, "d 'de' MMMM", { locale: es })} al{' '}
        {format(addDays(currentWeekStart, 4), "d 'de' MMMM 'de' yyyy", { locale: es })}
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ 
          width: '100%', 
          overflowX: 'auto',
          backgroundColor: '#f5f6f8'
        }}>
          <TableContainer 
            component={Paper} 
            sx={{ 
              boxShadow: 'none',
              maxWidth: '95%',
              margin: '0 auto',
              backgroundColor: 'transparent'
            }}
          >
            <Table sx={{ 
              borderCollapse: 'separate', 
              borderSpacing: 0,
              backgroundColor: 'white',
              '& .MuiTableCell-root': {
                borderColor: '#e0e0e0',
                padding: '8px'
              }
            }}>
              <TableHead>
                <TableRow>
                  <TableCell 
                    sx={{ 
                      bgcolor: 'rgb(99, 155, 255)',
                      color: 'white',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      padding: '8px',
                      width: '80px',
                      borderBottom: '1px solid #e0e0e0',
                      borderRight: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    Hora
                  </TableCell>
                  {DIAS.map((dia, index) => {
                    const fecha = addDays(currentWeekStart, index);
                    return (
                      <TableCell 
                        key={dia} 
                        align="center" 
                        sx={{ 
                          bgcolor: 'rgb(99, 155, 255)',
                          color: 'white',
                          padding: '8px 4px',
                          borderBottom: '1px solid #e0e0e0',
                          borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                          width: '18%'
                        }}
                      >
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center',
                          gap: 0.5
                        }}>
                          <Typography sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                            {dia}
                          </Typography>
                          <Typography sx={{ fontSize: '0.8rem' }}>
                            {format(fecha, "d 'de' MMMM", { locale: es })}
                          </Typography>
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {getHorasNecesarias(horarioData).map((hora) => (
                  <TableRow key={hora}>
                    <TableCell 
                      component="th" 
                      scope="row" 
                      sx={{ 
                        fontWeight: 'bold',
                        textAlign: 'center',
                        width: '80px',
                        padding: '8px',
                        borderRight: '1px solid #e0e0e0',
                        borderBottom: '1px solid #e0e0e0',
                        bgcolor: 'white',
                        fontSize: '0.9rem'
                      }}
                    >
                      {formatHora(hora)}
                    </TableCell>
                    {DIAS.map((dia, index) => {
                      const key = `${dia}-${hora}`;
                      const celda = horarioData.get(key);
                      
                      return (
                        <TableCell 
                          key={key} 
                          align="center"
                          sx={{ 
                            bgcolor: 'white',
                            padding: '4px',
                            borderBottom: '1px solid #e0e0e0',
                            borderRight: '1px solid #e0e0e0',
                            width: '18%',
                            minHeight: celda?.materia ? '120px' : 'auto',
                            height: celda?.materia ? '120px' : 'auto'
                          }}
                        >
                          {celda?.materia ? (
                            <Box sx={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: 0.25,
                              alignItems: 'center',
                              height: '100%',
                              justifyContent: 'space-between'
                            }}>
                              <Typography variant="body1" sx={{ 
                                fontWeight: 'bold',
                                fontSize: '0.8rem',
                                lineHeight: 1.2
                              }}>
                                {celda.materia}
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                fontSize: '0.75rem',
                                lineHeight: 1.2
                              }}>
                                Grupo: {celda.grupo}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ 
                                fontSize: '0.7rem',
                                lineHeight: 1.2
                              }}>
                                Aula: {celda.aula} - Edificio: {celda.edificio}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: celda.asistencia === 'presente' ? '#2e7d32' :
                                         celda.asistencia === 'ausente' ? '#d32f2f' :
                                         '#ed6c02',
                                  fontWeight: 'bold',
                                  fontSize: '0.75rem',
                                  lineHeight: 1.2
                                }}
                              >
                                Estado: {celda.asistencia.charAt(0).toUpperCase() + celda.asistencia.slice(1)}
                              </Typography>
                              <Box sx={{ 
                                display: 'flex', 
                                gap: 0.25,
                                justifyContent: 'center'
                              }}>
                                <Button
                                  size="small"
                                  variant={celda.asistencia === 'presente' ? "contained" : "outlined"}
                                  onClick={() => handleToggleAsistencia(dia, hora, 'presente')}
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
                                  variant={celda.asistencia === 'ausente' ? "contained" : "outlined"}
                                  onClick={() => handleToggleAsistencia(dia, hora, 'ausente')}
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
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              Sin clase
                            </Typography>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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