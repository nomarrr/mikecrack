import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Snackbar,
  styled,
  Button,
  Tooltip,
  ButtonGroup,
  Chip,
  Tabs,
  Tab
} from '@mui/material';
import {
  usuariosService,
  materiasService,
  horariosService,
  asistenciasService,
  gruposService,
  carrerasService,
  Usuario,
  Materia,
  HorarioMaestro,
  Asistencia
} from '../services/supabaseService';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, isSameDay, parseISO, addDays, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';

// Estilos personalizados
const StyledBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  '& .maestro-info': {
    backgroundColor: '#f5f5f5',
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '20px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
  },
  '& .horario-header': {
    backgroundColor: '#007bff',
    color: 'white',
    textAlign: 'center',
    padding: '10px',
    borderRadius: '5px 5px 0 0',
    marginBottom: '0'
  },
  '& .estado': {
    padding: '5px 10px',
    borderRadius: '50px',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  '& .asistio': {
    backgroundColor: '#d4edda',
    color: '#155724'
  },
  '& .falta': {
    backgroundColor: '#f8d7da',
    color: '#721c24'
  },
  '& .sin-registro': {
    backgroundColor: '#f8d7da',
    color: '#721c24'
  },
  '& .MuiPickersDay-root': {
    '&.Mui-selected': {
      backgroundColor: theme.palette.primary.main,
      color: 'white',
      '&:hover': {
        backgroundColor: theme.palette.primary.dark
      }
    }
  }
}));

// Constante para los días de la semana
const DIAS_SEMANA = [
  { nombre: 'Lunes', index: 1 },
  { nombre: 'Martes', index: 2 },
  { nombre: 'Miércoles', index: 3 },
  { nombre: 'Jueves', index: 4 },
  { nombre: 'Viernes', index: 5 }
];

// Función para organizar los horarios por día
const organizarHorariosPorDia = (
  horarios: any[],
  asistencias: any,
  fechaInicio: Date
) => {
  const horariosPorDia: { [key: string]: any } = {};
  
  // Asegurarse de que fechaInicio sea lunes
  const inicioSemana = startOfWeek(fechaInicio, { weekStartsOn: 1 });

  DIAS_SEMANA.forEach(({ nombre, index }) => {
    const fecha = addDays(inicioSemana, index - 1);
    horariosPorDia[nombre] = {
      fecha,
      horarios: horarios.map(horario => {
        const checadorAsistencia = asistencias.checador.find(a => 
          a.horario_id === horario.id && isSameDay(parseISO(a.fecha), fecha)
        );
        const jefeAsistencia = asistencias.jefe.find(a => 
          a.horario_id === horario.id && isSameDay(parseISO(a.fecha), fecha)
        );
        const maestroAsistencia = asistencias.maestro.find(a => 
          a.horario_id === horario.id && isSameDay(parseISO(a.fecha), fecha)
        );

        return {
          ...horario,
          checadorAsistencia,
          jefeAsistencia,
          maestroAsistencia
        };
      })
    };
  });

  return horariosPorDia;
};

// Agregar el tipo UserRole si no está definido
type UserRole = 'Maestro' | 'Jefe_de_Grupo' | 'Checador';

export default function ConsultaAsistenciasPage() {
  // Estados
  const [selectedMaestro, setSelectedMaestro] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maestros, setMaestros] = useState<Usuario[]>([]);
  const [horarios, setHorarios] = useState<any[]>([]);
  const [asistencias, setAsistencias] = useState<{
    checador: Asistencia[];
    jefe: Asistencia[];
    maestro: Asistencia[];
  }>({ checador: [], jefe: [], maestro: [] });
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { locale: es }));
  const [weekStats, setWeekStats] = useState<{
    total: number;
    asistencias: {
      checador: number;
      jefe: number;
      maestro: number;
    };
    faltas: {
      checador: number;
      jefe: number;
      maestro: number;
    };
  }>({ total: 0, asistencias: { checador: 0, jefe: 0, maestro: 0 }, faltas: { checador: 0, jefe: 0, maestro: 0 } });
  const [horariosPorDia, setHorariosPorDia] = useState<{ [key: string]: any }>({});
  const [selectedRole, setSelectedRole] = useState<UserRole>('Maestro');
  const [fechaInicio, setFechaInicio] = useState<Date | null>(new Date());
  const [fechaFin, setFechaFin] = useState<Date | null>(new Date());
  const [reporteData, setReporteData] = useState<any[]>([]);
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    asistencias: 0,
    faltas: 0,
    porcentaje: 0
  });

  // Nuevos estados para carreras y grupos
  const [carreras, setCarreras] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [selectedCarrera, setSelectedCarrera] = useState<string>('');
  const [selectedGrupo, setSelectedGrupo] = useState<string>('');
  const [reportePorGrupo, setReportePorGrupo] = useState<any[]>([]);

  // Nuevo estado para la vista actual
  const [vistaActual, setVistaActual] = useState<'maestro' | 'grupo'>('maestro');
  const [estadisticasGenerales, setEstadisticasGenerales] = useState<any[]>([]);

  // Agregar nuevo estado para el tipo de registro
  const [tipoRegistro, setTipoRegistro] = useState<'maestro' | 'jefe' | 'checador'>('maestro');

  // En la sección de estados, agregar:
  const [tipoRegistroGrupo, setTipoRegistroGrupo] = useState<'maestro' | 'jefe' | 'checador'>('maestro');

  // Cargar datos iniciales
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const maestrosData = await usuariosService.getAll();
        setMaestros(maestrosData.filter(u => u.role === 'Maestro'));
      } catch (err: any) {
        setError('Error al cargar maestros: ' + err.message);
      }
    };
    fetchInitialData();
  }, []);

  // Cargar carreras al inicio
  useEffect(() => {
    const fetchCarreras = async () => {
      try {
        const carrerasData = await carrerasService.getAll();
        setCarreras(carrerasData);
      } catch (err: any) {
        setError('Error al cargar carreras: ' + err.message);
      }
    };
    fetchCarreras();
  }, []);

  // Cargar grupos cuando se selecciona una carrera
  useEffect(() => {
    if (!selectedCarrera) {
      setGrupos([]);
      return;
    }

    const fetchGrupos = async () => {
      try {
        const gruposData = await gruposService.getByCarrera(selectedCarrera);
        setGrupos(gruposData);
      } catch (err: any) {
        setError('Error al cargar grupos: ' + err.message);
      }
    };
    fetchGrupos();
  }, [selectedCarrera]);

  // Función para manejar el cambio de fecha
  const handleDateChange = (date: Date | null) => {
    if (date) {
      // Obtener el inicio de la semana (lunes) para la fecha seleccionada
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      setCurrentWeekStart(weekStart);
      setSelectedDate(date);
    }
  };

  // Función para verificar si una fecha está en la semana actual
  const isDateInCurrentWeek = (date: Date) => {
    const start = currentWeekStart;
    const end = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return isWithinInterval(date, { start, end });
  };

  // Efecto para cargar asistencias de la semana
  useEffect(() => {
    if (!selectedMaestro) return;

    const fetchWeekData = async () => {
      setLoading(true);
      try {
        const weekEnd = endOfWeek(currentWeekStart, { locale: es });
        
        const result = await asistenciasService.getAsistenciasPorRango(
          selectedMaestro,
          format(currentWeekStart, 'yyyy-MM-dd'),
          format(weekEnd, 'yyyy-MM-dd'),
          selectedRole
        );

        setReporteData(result);

        // Calcular estadísticas
        const total = result.length;
        const asistencias = result.filter(a => a.asistencia?.toLowerCase() === 'presente').length;
        const faltas = result.filter(a => a.asistencia?.toLowerCase() === 'ausente').length;
        const porcentaje = total > 0 ? Math.round((asistencias / total) * 100) : 0;

        setEstadisticas({
          total,
          asistencias,
          faltas,
          porcentaje
        });

      } catch (err: any) {
        setError('Error al cargar datos de la semana: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWeekData();
  }, [selectedMaestro, selectedRole, currentWeekStart]);

  // Funciones auxiliares para manejar estados
  const getEstadoClass = (estado?: string) => {
    if (!estado) return 'sin-registro';
    switch (estado.toLowerCase()) {
      case 'presente':
        return 'asistio';
      case 'ausente':
        return 'falta';
      case 'pendiente':
        return 'sin-registro';
      default:
        return 'sin-registro';
    }
  };

  const getEstadoText = (estado?: string) => {
    if (!estado || estado.toLowerCase() === 'pendiente') {
      return 'Sin registro';
    }
    return estado;
  };

  // Modificar el efecto que obtiene los datos
  useEffect(() => {
    if (!selectedMaestro || !selectedRole) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await asistenciasService.getAsistenciasPorRango(
          selectedMaestro,
          format(fechaInicio || new Date(), 'yyyy-MM-dd'),
          format(fechaFin || new Date(), 'yyyy-MM-dd'),
          selectedRole
        );

        console.log('Datos recibidos:', data);
        
        // Filtrar datos según el rol seleccionado
        const filteredData = data.filter(record => {
          switch (selectedRole) {
            case 'Jefe_de_Grupo':
              return record.registradoPor === 'Jefe_de_Grupo';
            case 'Checador':
              return record.registradoPor === 'Checador';
            case 'Maestro':
              return record.registradoPor === 'Maestro';
            default:
              return false;
          }
        });

        console.log('Datos filtrados:', filteredData);
        
        setReporteData(filteredData);

        // Calcular estadísticas
        const totalRegistros = filteredData.length;
        const asistencias = filteredData.filter(record => {
          const estado = record.asistencia?.toLowerCase();
          return estado === 'presente' || estado === 'asistió';
        }).length;
        const faltas = filteredData.filter(record => {
          const estado = record.asistencia?.toLowerCase();
          return estado === 'ausente' || estado === 'falta';
        }).length;
        const porcentaje = totalRegistros > 0 ? Math.round((asistencias / totalRegistros) * 100) : 0;

        setEstadisticas({
          total: totalRegistros,
          asistencias,
          faltas,
          porcentaje
        });

      } catch (error) {
        console.error('Error al cargar datos:', error);
        setError('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMaestro, selectedRole, fechaInicio, fechaFin]);

  // Modificar la función generarReporte
  const generarReporte = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!selectedMaestro || !fechaInicio || !fechaFin) {
        throw new Error('Seleccione todos los campos requeridos');
      }

      const data = await asistenciasService.getAsistenciasPorRango(
        selectedMaestro,
        format(fechaInicio, 'yyyy-MM-dd'),
        format(fechaFin, 'yyyy-MM-dd'),
        selectedRole
      );

      setReporteData(data);

      // Calcular estadísticas
      const total = data.length;
      const asistenciasCount = data.filter(a => 
        a.asistencia?.toLowerCase() === 'presente' || 
        a.asistencia?.toLowerCase() === 'asistió'
      ).length;
      const faltas = total - asistenciasCount;
      const porcentaje = total > 0 ? Math.round((asistenciasCount / total) * 100) : 0;

      setEstadisticas({
        total,
        asistencias: asistenciasCount,
        faltas,
        porcentaje
      });

    } catch (err: any) {
      console.error('Error en generarReporte:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Modificar la función generarPDFReporte
  const generarPDFReporte = async () => {
    try {
      setLoading(true);
      
      // Dentro de generarPDFReporte, antes de procesar los datos:
      const procesarDatos = (datos: any[]) => {
        console.log('Datos antes de procesar:', datos); // Debug
        return datos.map(dato => {
          const estadoOriginal = dato.asistencia?.toLowerCase();
          console.log('Estado original:', estadoOriginal); // Debug
          
          let estadoFinal;
          if (estadoOriginal === 'presente') {
            estadoFinal = 'Presente';
          } else if (estadoOriginal === 'ausente') {
            estadoFinal = 'Ausente';
          } else {
            estadoFinal = 'Sin registro';
          }
          
          const registroProcesado = {
            ...dato,
            asistencia: estadoFinal
          };
          console.log('Registro procesado:', registroProcesado); // Debug
          return registroProcesado;
        });
      };

      // Y luego usar esto al obtener los datos:
      const [dataMaestro, dataJefe, dataChecador] = await Promise.all([
        asistenciasService.getAsistenciasPorRango(
          selectedMaestro,
          format(fechaInicio!, 'yyyy-MM-dd'),
          format(fechaFin!, 'yyyy-MM-dd'),
          'Maestro'
        ).then(data => {
          console.log('Datos crudos del servicio:', data);
          return procesarDatos(data);
        }),
        asistenciasService.getAsistenciasPorRango(
          selectedMaestro,
          format(fechaInicio!, 'yyyy-MM-dd'),
          format(fechaFin!, 'yyyy-MM-dd'),
          'Jefe_de_Grupo'
        ).then(data => {
          console.log('Datos originales:', data); // Para debug
          return procesarDatos(data);
        }),
        asistenciasService.getAsistenciasPorRango(
          selectedMaestro,
          format(fechaInicio!, 'yyyy-MM-dd'),
          format(fechaFin!, 'yyyy-MM-dd'),
          'Checador'
        ).then(data => {
          console.log('Datos originales:', data); // Para debug
          return procesarDatos(data);
        })
      ]);

      const maestroSeleccionado = maestros.find(m => m.id?.toString() === selectedMaestro);

      // Crear el PDF
      const doc = new jsPDF();
      
      // Agregar encabezado con estilo
      doc.setFillColor(99, 155, 255);
      doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text('Reporte de Asistencias', 105, 25, { align: 'center' });
      
      // Información del maestro con estilo
      doc.setFillColor(245, 245, 245);
      doc.rect(10, 45, doc.internal.pageSize.width - 20, 30, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`Maestro: ${maestroSeleccionado?.name}`, 15, 60);
      doc.text(`Período: ${format(fechaInicio!, 'dd/MM/yyyy')} - ${format(fechaFin!, 'dd/MM/yyyy')}`, 15, 70);

      let yPos = 90;

      // Función para dibujar gráfica de pastel mejorada
      const dibujarGraficaPastel = (
        doc: jsPDF, 
        asistencias: number, 
        faltas: number, 
        x: number, 
        y: number, 
        radio: number
      ) => {
        const total = asistencias + faltas;
        const porcentajeAsistencias = (asistencias / total);
        
        // Dibujar círculo base en rojo (faltas)
        doc.setFillColor(244, 67, 54);
        doc.circle(x, y, radio, 'F');
        
        if (asistencias > 0) {
          // Dibujar sector de asistencias en verde (más plano)
          doc.setFillColor(46, 125, 50);
          const angulo = porcentajeAsistencias * 360;
          const segmentos = 100;
          const anguloIncremento = angulo / segmentos;
          
          for (let i = 0; i <= segmentos; i++) {
            const anguloActual = (i * anguloIncremento - 90) * Math.PI / 180;
            const anguloSiguiente = ((i + 1) * anguloIncremento - 90) * Math.PI / 180;
            
            doc.triangle(
              x, y,
              x + radio * Math.cos(anguloActual), y + radio * Math.sin(anguloActual),
              x + radio * Math.cos(anguloSiguiente), y + radio * Math.sin(anguloSiguiente),
              'F'
            );
          }
        }

        // Agregar leyenda mejorada
        const legendaY = y + radio + 15;
        
        // Asistencias
        doc.setFillColor(46, 125, 50);
        doc.rect(x - 40, legendaY, 8, 8, 'F');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Asistencias: ${asistencias} (${Math.round(porcentajeAsistencias * 100)}%)`, x - 28, legendaY + 6);
        
        // Faltas
        doc.setFillColor(244, 67, 54);
        doc.rect(x - 40, legendaY + 15, 8, 8, 'F');
        doc.text(`Faltas: ${faltas} (${Math.round((1 - porcentajeAsistencias) * 100)}%)`, x - 28, legendaY + 21);
      };

      // Función para procesar datos de cada rol con mejor diseño
      const procesarDatosRol = (rolData: any[], rolNombre: string, yPosition: number) => {
        const total = rolData.length;
        const asistencias = rolData.filter(a => 
          a.asistencia?.toLowerCase() === 'presente'
        ).length;
        const faltas = rolData.filter(a => 
          a.asistencia?.toLowerCase() === 'ausente'
        ).length;

        // Título del rol con fondo mejorado
        doc.setFillColor(99, 155, 255);
        doc.rect(0, yPosition - 5, doc.internal.pageSize.width, 25, 'F');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text(`Registro por ${rolNombre}`, doc.internal.pageSize.width / 2, yPosition + 8, { align: 'center' });

        if (total > 0) {
          // Dibujar gráfica de pastel centrada
          dibujarGraficaPastel(
            doc,
            asistencias,
            faltas,
            doc.internal.pageSize.width / 2, // Centrado horizontalmente
            yPosition + 60, // Ajustado verticalmente
            20 // Radio más pequeño
          );

          // Estadísticas en cajas mejoradas
          const statsY = yPosition + 120;
          const boxWidth = 50;
          const spacing = 5;
          const startX = (doc.internal.pageSize.width - (3 * boxWidth + 2 * spacing)) / 2;

          // Total registros
          doc.setFillColor(99, 155, 255);
          doc.roundedRect(startX, statsY, boxWidth, 40, 3, 3, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12);
          doc.text('Total', startX + boxWidth/2, statsY + 15, { align: 'center' });
          doc.setFontSize(18);
          doc.text(total.toString(), startX + boxWidth/2, statsY + 32, { align: 'center' });

          // Asistencias
          doc.setFillColor(46, 125, 50);
          doc.roundedRect(startX + boxWidth + spacing, statsY, boxWidth, 40, 3, 3, 'F');
          doc.setFontSize(12);
          doc.text('Asistencias', startX + boxWidth + spacing + boxWidth/2, statsY + 15, { align: 'center' });
          doc.setFontSize(18);
          doc.text(asistencias.toString(), startX + boxWidth + spacing + boxWidth/2, statsY + 32, { align: 'center' });

          // Faltas
          doc.setFillColor(244, 67, 54);
          doc.roundedRect(startX + 2 * (boxWidth + spacing), statsY, boxWidth, 40, 3, 3, 'F');
          doc.setFontSize(12);
          doc.text('Faltas', startX + 2 * (boxWidth + spacing) + boxWidth/2, statsY + 15, { align: 'center' });
          doc.setFontSize(18);
          doc.text(faltas.toString(), startX + 2 * (boxWidth + spacing) + boxWidth/2, statsY + 32, { align: 'center' });

          // Tabla de registros mejorada
          autoTable(doc, {
            startY: statsY + 50,
            head: [['Fecha', 'Hora', 'Materia', 'Grupo', 'Estado']],
            body: rolData.map(registro => {
              console.log('Procesando registro para tabla:', registro);
              return [
                format(new Date(registro.fecha), 'dd/MM/yyyy'),
                registro.hora || '',
                registro.materiaNombre || '',
                registro.grupoInfo || '',
                registro.asistencia // Estado
              ];
            }),
            theme: 'grid',
            styles: {
              fontSize: 9,
              cellPadding: 4,
              lineColor: [200, 200, 200],
              lineWidth: 0.1,
              halign: 'center'
            },
            headStyles: {
              fillColor: [99, 155, 255],
              textColor: [255, 255, 255],
              fontStyle: 'bold'
            },
            columnStyles: {
              4: {
                halign: 'center',
                cellWidth: 30,
                fillColor: function(row) {
                  const estado = String(row.raw).toLowerCase();
                  if (estado === 'presente') {
                    return [46, 125, 50]; // Verde plano para presente
                  } else if (estado === 'ausente') {
                    return [244, 67, 54]; // Rojo para ausente
                  }
                  return [128, 128, 128]; // Gris para otros casos
                },
                textColor: [255, 255, 255],
                fontStyle: 'bold'
              }
            },
            didParseCell: function(data) {
              // Para debugging
              if (data.column.index === 4) {
                console.log('Celda de estado:', data.cell.raw);
              }
            },
            willDrawCell: function(data) {
              // Para asegurar que el estado sea visible
              if (data.column.index === 4) {
                const doc = data.doc;
                const estado = String(data.cell.raw).toLowerCase();
                if (estado === 'presente') {
                  doc.setFillColor(46, 125, 50);
                } else if (estado === 'ausente') {
                  doc.setFillColor(244, 67, 54);
                } else {
                  doc.setFillColor(128, 128, 128);
                }
              }
            }
          });
        } else {
          // Mensaje cuando no hay datos
          doc.setTextColor(128, 128, 128);
          doc.setFontSize(12);
          doc.text('No hay registros para mostrar en este período', 
            doc.internal.pageSize.width / 2, 
            yPosition + 50, 
            { align: 'center' }
          );
        }

        return (doc as any).lastAutoTable?.finalY || yPosition + 60;
      };

      // Procesar cada rol en páginas separadas
      yPos = procesarDatosRol(dataMaestro, 'Maestro', yPos);
      doc.addPage();
      yPos = 20;
      yPos = procesarDatosRol(dataJefe, 'Jefe de Grupo', yPos);
      doc.addPage();
      yPos = 20;
      yPos = procesarDatosRol(dataChecador, 'Checador', yPos);

      // Guardar el PDF con nombre formateado
      const fechaGeneracion = format(new Date(), 'dd-MM-yyyy_HH-mm');
      doc.save(`Reporte_${maestroSeleccionado?.name}_${fechaGeneracion}.pdf`);

    } catch (err: any) {
      console.error('Error completo:', err);
      setError('Error al generar el PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para generar reporte por grupo
  const generarReportePorGrupo = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!selectedGrupo || !fechaInicio || !fechaFin) {
        throw new Error('Seleccione un grupo y rango de fechas');
      }

      const data = await asistenciasService.getAsistenciasPorGrupo(
        selectedGrupo,
        format(fechaInicio, 'yyyy-MM-dd'),
        format(fechaFin, 'yyyy-MM-dd')
      );

      setReportePorGrupo(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener estadísticas generales
  const obtenerEstadisticasGenerales = async () => {
    try {
      setLoading(true);
      if (!fechaInicio || !fechaFin) {
        throw new Error('Seleccione un rango de fechas válido');
      }

      const { data: horarios, error: horarioError } = await supabase
        .from('horario-maestro')
        .select(`
          id,
          maestro:usuarios!horario-maestro_maestro_id_fkey (
            id,
            name
          )
        `);

      if (horarioError) throw horarioError;

      const maestros = new Map();
      horarios?.forEach(horario => {
        if (horario.maestro) {
          maestros.set(horario.maestro.id, {
            id: horario.maestro.id,
            nombre: horario.maestro.name,
            total: 0,
            asistencias: 0,
            faltas: 0
          });
        }
      });

      const { data: asistencias, error: asistenciaError } = await supabase
        .from('asistencia_maestro')
        .select('*')
        .gte('fecha', format(fechaInicio, 'yyyy-MM-dd'))
        .lte('fecha', format(fechaFin, 'yyyy-MM-dd'));

      if (asistenciaError) throw asistenciaError;

      asistencias?.forEach(asistencia => {
        const horario = horarios?.find(h => h.id === asistencia.horario_id);
        if (horario?.maestro) {
          const maestro = maestros.get(horario.maestro.id);
          if (maestro) {
            maestro.total++;
            if (asistencia.asistencia?.toLowerCase() === 'presente') {
              maestro.asistencias++;
            } else {
              maestro.faltas++;
            }
          }
        }
      });

      const estadisticas = Array.from(maestros.values())
        .map(maestro => ({
          ...maestro,
          porcentaje: maestro.total > 0 
            ? Math.round((maestro.asistencias / maestro.total) * 100) 
            : 0
        }))
        .sort((a, b) => b.porcentaje - a.porcentaje);

      setEstadisticasGenerales(estadisticas);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledBox>
      <Typography variant="h4" gutterBottom align="center">
        Sistema de Asistencias
      </Typography>

      {/* Selector de vista */}
      <Paper sx={{ mb: 3, borderRadius: 1, overflow: 'hidden' }}>
        <Tabs
          value={vistaActual === 'maestro' ? 0 : 1}
          onChange={(_, newValue) => setVistaActual(newValue === 0 ? 'maestro' : 'grupo')}
          variant="fullWidth"
          textColor="primary"
          indicatorColor="primary"
          sx={{ 
            '& .MuiTabs-flexContainer': {
              flexDirection: 'row'
            }
          }}
        >
          <Tab label="Vista por Maestro" />
          <Tab label="Vista por Grupo" />
        </Tabs>
      </Paper>

      {vistaActual === 'maestro' ? (
        /* Vista por Maestro (original) */
        <Box>
          <Box className="maestro-info">
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Rol</InputLabel>
                <Select
                  value={selectedRole}
                  label="Rol"
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                >
                  <MenuItem value="Maestro">Maestro</MenuItem>
                  <MenuItem value="Jefe_de_Grupo">Jefe de Grupo</MenuItem>
                  <MenuItem value="Checador">Checador</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Seleccione al Maestro</InputLabel>
                <Select
                  value={selectedMaestro}
                  label="Seleccione al Maestro"
                  onChange={(e) => setSelectedMaestro(e.target.value)}
                >
                  {maestros
                    .filter(u => u.role === 'Maestro')
                    .map((usuario) => (
                      <MenuItem key={usuario.id} value={usuario.id?.toString()}>
                        {usuario.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <DatePicker
                  label="Fecha Inicio"
                  value={fechaInicio}
                  onChange={setFechaInicio}
                  format="dd/MM/yyyy"
                />
                <DatePicker
                  label="Fecha Fin"
                  value={fechaFin}
                  onChange={setFechaFin}
                  format="dd/MM/yyyy"
                />
              </LocalizationProvider>


              <Button 
                variant="contained" 
                onClick={generarPDFReporte}
                disabled={loading || reporteData.length === 0}
                color="secondary"
                startIcon={<i className='bx bxs-file-pdf' />}
              >
                GENERAR REPORTE
              </Button>
            </Box>
          </Box>

          {/* Estadísticas originales */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Paper sx={{ p: 2, flex: 1, textAlign: 'center' }}>
              <Typography variant="h6">Total Registros</Typography>
              <Typography variant="h4">{estadisticas.total}</Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, textAlign: 'center' }}>
              <Typography variant="h6">Asistencias</Typography>
              <Typography variant="h4" color="success.main">
                {estadisticas.asistencias}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, textAlign: 'center' }}>
              <Typography variant="h6">Faltas</Typography>
              <Typography variant="h4" color="error.main">
                {estadisticas.faltas}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, textAlign: 'center' }}>
              <Typography variant="h6">Porcentaje</Typography>
              <Typography variant="h4" color="info.main">
                {estadisticas.porcentaje}%
              </Typography>
            </Paper>
          </Box>

          {/* Tabla de registros */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Hora</TableCell>
                  <TableCell>Materia</TableCell>
                  <TableCell>Grupo</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Registrado por</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : reporteData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No hay registros para mostrar
                    </TableCell>
                  </TableRow>
                ) : (
                  reporteData.map((registro) => (
                    <TableRow key={registro.id}>
                      <TableCell>
                        {format(new Date(registro.fecha), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{registro.hora}</TableCell>
                      <TableCell>{registro.materiaNombre}</TableCell>
                      <TableCell>{registro.grupoInfo}</TableCell>
                      <TableCell>
                        <Chip
                          label={registro.asistencia}
                          color={registro.asistencia?.toLowerCase() === 'presente' ? 'success' : 'error'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{registro.registradoPor}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ) : (
        /* Vista por Grupo */
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Carrera</InputLabel>
              <Select
                value={selectedCarrera}
                label="Carrera"
                onChange={(e) => {
                  setSelectedCarrera(e.target.value);
                  setSelectedGrupo('');
                }}
              >
                {carreras.map((carrera) => (
                  <MenuItem key={carrera.id} value={carrera.id}>
                    {carrera.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth disabled={!selectedCarrera}>
              <InputLabel>Grupo</InputLabel>
              <Select
                value={selectedGrupo}
                label="Grupo"
                onChange={(e) => setSelectedGrupo(e.target.value)}
              >
                {grupos.map((grupo) => (
                  <MenuItem key={grupo.id} value={grupo.id}>
                    {grupo.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <DatePicker
                  label="Fecha Inicio"
                  value={fechaInicio}
                  onChange={setFechaInicio}
                  format="dd/MM/yyyy"
                />
                <DatePicker
                  label="Fecha Fin"
                  value={fechaFin}
                  onChange={setFechaFin}
                  format="dd/MM/yyyy"
                />
              </LocalizationProvider>
              <Button 
                variant="contained"
                onClick={generarReportePorGrupo}
                disabled={loading || !selectedGrupo}
              >
                Generar Reporte
              </Button>
            </Box>

            <ButtonGroup variant="outlined" size="small">
              <Button
                onClick={() => setTipoRegistroGrupo('maestro')}
                variant={tipoRegistroGrupo === 'maestro' ? 'contained' : 'outlined'}
              >
                Registros Maestro
              </Button>
              <Button
                onClick={() => setTipoRegistroGrupo('jefe')}
                variant={tipoRegistroGrupo === 'jefe' ? 'contained' : 'outlined'}
              >
                Registros Jefe
              </Button>
              <Button
                onClick={() => setTipoRegistroGrupo('checador')}
                variant={tipoRegistroGrupo === 'checador' ? 'contained' : 'outlined'}
              >
                Registros Checador
              </Button>
            </ButtonGroup>
          </Box>

          {reportePorGrupo.length > 0 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Maestro</TableCell>
                    <TableCell>Materias</TableCell>
                    <TableCell align="center">Total Clases</TableCell>
                    <TableCell align="center">Asistencias</TableCell>
                    <TableCell align="center">Faltas</TableCell>
                    <TableCell align="center">Porcentaje</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportePorGrupo
                    .filter(registro => registro.tipoRegistro === tipoRegistroGrupo)
                    .map((registro) => (
                      <TableRow key={registro.maestroId}>
                        <TableCell>{registro.maestroNombre}</TableCell>
                        <TableCell>{registro.materias}</TableCell>
                        <TableCell align="center">{registro.total}</TableCell>
                        <TableCell align="center">{registro.asistencias}</TableCell>
                        <TableCell align="center">{registro.faltas}</TableCell>
                        <TableCell align="center">
                          <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Box sx={{
                              width: '100px',
                              height: '20px',
                              bgcolor: '#f0f0f0',
                              borderRadius: '10px',
                              overflow: 'hidden'
                            }}>
                              <Box sx={{
                                width: `${registro.porcentaje}%`,
                                height: '100%',
                                bgcolor: registro.porcentaje >= 80 ? 'success.main' :
                                        registro.porcentaje >= 60 ? 'warning.main' :
                                        'error.main'
                              }} />
                            </Box>
                            <Typography sx={{ ml: 1 }}>
                              {registro.porcentaje}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </StyledBox>
  );
} 