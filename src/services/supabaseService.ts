import { supabase } from '../lib/supabase';

export type UserRole = 
  | 'Alumno' 
  | 'Jefe_de_Grupo' 
  | 'Checador'
  | 'Maestro' 
  | 'Administrador';

export interface Usuario {
  id?: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  numero_cuenta?: string;
}

export interface Grupo {
  id?: number;
  name: string;
  classroom?: string;
  building?: string;
  jefe_nocuenta?: string;
  carrera_id?: number;
}

export interface Materia {
  id?: number;
  name: string;
  semestre: number;
  carrera_id: number;
}

export interface Carrera {
  id?: number;
  nombre: string;
  semestres?: number;
}

export interface HorarioMaestro {
  id?: number;
  maestro_id: number;
  materia_id: number;
  grupo_id: number;
  dia: string;
  hora: string;
  asistencia: boolean;
}

export interface Edificio {
  id?: number;
  facultad: string;
  nombre?: string;
}

export interface Asistencia {
  id: number;
  horario_id: number;
  fecha: string;
  asistencia: 'Asistió' | 'Falta' | 'Retardo';
}

// Servicios CRUD para usuarios
export const usuariosService = {
  async getAll(): Promise<Usuario[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*');
    
    if (error) throw new Error(error.message);
    return data as Usuario[];
  },

  async getById(id: number): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(error.message);
    return data as Usuario;
  },

  async verificarNumeroCuentaUnico(numeroCuenta: string, userId?: number): Promise<boolean> {
    const query = supabase
      .from('usuarios')
      .select('id')
      .eq('numero_cuenta', numeroCuenta);
    
    // Si estamos editando, excluimos el usuario actual
    if (userId) {
      query.neq('id', userId);
    }

    const { data, error } = await query;
    
    if (error) throw new Error('Error al verificar número de cuenta: ' + error.message);
    return data.length === 0; // Retorna true si el número de cuenta NO está en uso
  },

  async create(usuario: Usuario): Promise<Usuario> {
    // Verificar si se proporcionó un número de cuenta
    if (usuario.numero_cuenta) {
      const esUnico = await this.verificarNumeroCuentaUnico(usuario.numero_cuenta);
      if (!esUnico) {
        throw new Error('El número de cuenta ya está registrado para otro usuario');
      }
    }

    const { data, error } = await supabase
      .from('usuarios')
      .insert([usuario])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: number, usuario: Partial<Usuario>): Promise<Usuario> {
    // Verificar si se está actualizando el número de cuenta
    if (usuario.numero_cuenta) {
      const esUnico = await this.verificarNumeroCuentaUnico(usuario.numero_cuenta, id);
      if (!esUnico) {
        throw new Error('El número de cuenta ya está registrado para otro usuario');
      }
    }

    const { data, error } = await supabase
      .from('usuarios')
      .update(usuario)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(error.message);
  }
};

// Servicios CRUD para grupos
export const gruposService = {
  async getAll(): Promise<Grupo[]> {
    const { data, error } = await supabase
      .from('grupo')
      .select('*');
    
    if (error) throw new Error(error.message);
    return data as Grupo[];
  },

  async getById(id: number): Promise<Grupo | null> {
    const { data, error } = await supabase
      .from('grupo')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(error.message);
    return data as Grupo;
  },

  async create(grupo: Grupo): Promise<Grupo> {
    if (grupo.jefe_nocuenta) {
      const jefeAsignado = await this.verificarJefeAsignado(grupo.jefe_nocuenta);
      if (jefeAsignado) {
        throw new Error('El jefe de grupo seleccionado ya está asignado a otro grupo');
      }
    }

    const { data, error } = await supabase
      .from('grupo')
      .insert([grupo])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async verificarJefeAsignado(jefeNoCuenta: string, grupoId?: number): Promise<boolean> {
    // Primero verificamos si el usuario es jefe de grupo
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('role')
      .eq('numero_cuenta', jefeNoCuenta)
      .single();

    if (userError) throw new Error('Error al verificar el rol del usuario');
    
    if (usuario.role !== 'Jefe_de_Grupo') {
      throw new Error('El usuario seleccionado no es Jefe de Grupo');
    }

    // Luego verificamos si ya está asignado a algún grupo
    const query = supabase
      .from('grupo')
      .select('id')
      .eq('jefe_nocuenta', jefeNoCuenta);
    
    if (grupoId) {
      query.neq('id', grupoId);
    }

    const { data, error } = await query;
    
    if (error) throw new Error('Error al verificar asignación de jefe: ' + error.message);
    return data.length > 0;
  },

  async update(id: number, grupo: Grupo): Promise<Grupo> {
    if (grupo.jefe_nocuenta) {
      const jefeAsignado = await this.verificarJefeAsignado(grupo.jefe_nocuenta, id);
      if (jefeAsignado) {
        throw new Error('El jefe de grupo seleccionado ya está asignado a otro grupo');
      }
    }

    const { data, error } = await supabase
      .from('grupo')
      .update(grupo)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('grupo')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(error.message);
  },

  async getClassrooms(): Promise<string[]> {
    const { data, error } = await supabase
      .from('grupo')
      .select('classroom');
    
    if (error) throw new Error(error.message);
    
    // Obtener valores únicos
    const classrooms = data.map(item => item.classroom);
    return [...new Set(classrooms)];
  },

  async getBuildings(): Promise<string[]> {
    const { data, error } = await supabase
      .from('grupo')
      .select('building');
    
    if (error) throw new Error(error.message);
    
    // Obtener valores únicos
    const buildings = data.map(item => item.building);
    return [...new Set(buildings)];
  },

  async getByCarrera(carreraId: number): Promise<Grupo[]> {
    const { data, error } = await supabase
      .from('grupo')
      .select('*')
      .eq('carrera_id', carreraId);
    
    if (error) throw new Error(error.message);
    return data as Grupo[];
  }
};

// Servicios CRUD para materias
export const materiasService = {
  async getAll(): Promise<Materia[]> {
    const { data, error } = await supabase
      .from('materias')
      .select('*');
    
    if (error) throw new Error(error.message);
    return data as Materia[];
  },

  async getBySemestre(semestre: number): Promise<Materia[]> {
    const { data, error } = await supabase
      .from('materias')
      .select('*')
      .eq('semestre', semestre);
    
    if (error) throw new Error(error.message);
    return data as Materia[];
  },

  async getByCarrera(carreraId: number): Promise<Materia[]> {
    const { data, error } = await supabase
      .from('materias')
      .select('*')
      .eq('carrera_id', carreraId);
    
    if (error) throw new Error(error.message);
    return data as Materia[];
  },

  async getBySemestreAndCarrera(semestre: number, carreraId: number): Promise<Materia[]> {
    const { data, error } = await supabase
      .from('materias')
      .select('*')
      .eq('semestre', semestre)
      .eq('carrera_id', carreraId);
    
    if (error) throw new Error(error.message);
    return data as Materia[];
  },

  async getById(id: number): Promise<Materia | null> {
    const { data, error } = await supabase
      .from('materias')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(error.message);
    return data as Materia;
  },

  async verificarMateriaUnica(nombre: string, semestre: number, carreraId: number, materiaId?: number): Promise<boolean> {
    const query = supabase
      .from('materias')
      .select('id')
      .eq('name', nombre)
      .eq('semestre', semestre)
      .eq('carrera_id', carreraId);
    
    // Si estamos editando, excluimos la materia actual
    if (materiaId) {
      query.neq('id', materiaId);
    }

    const { data, error } = await query;
    
    if (error) throw new Error('Error al verificar materia: ' + error.message);
    return data.length === 0; // Retorna true si la materia NO está duplicada
  },

  async create(materia: Materia): Promise<Materia> {
    // Verificar si la materia ya existe en el mismo semestre y carrera
    const esUnica = await this.verificarMateriaUnica(
      materia.name,
      materia.semestre,
      materia.carrera_id
    );

    if (!esUnica) {
      throw new Error('Ya existe una materia con el mismo nombre en este semestre y carrera');
    }

    const { data, error } = await supabase
      .from('materias')
      .insert(materia)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as Materia;
  },

  async update(id: number, materia: Partial<Materia>): Promise<Materia> {
    // Obtener la materia actual para tener todos los datos necesarios
    const materiaActual = await this.getById(id);
    if (!materiaActual) throw new Error('Materia no encontrada');

    // Verificar si los cambios crearían un duplicado
    const esUnica = await this.verificarMateriaUnica(
      materia.name || materiaActual.name,
      materia.semestre || materiaActual.semestre,
      materia.carrera_id || materiaActual.carrera_id,
      id
    );

    if (!esUnica) {
      throw new Error('Ya existe una materia con el mismo nombre en este semestre y carrera');
    }

    const { data, error } = await supabase
      .from('materias')
      .update(materia)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as Materia;
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('materias')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(error.message);
  }
};

// Servicios CRUD para carreras
export const carrerasService = {
  async getAll(): Promise<Carrera[]> {
    const { data, error } = await supabase
      .from('carreras')
      .select('*')
      .order('nombre');
    
    if (error) {
      console.error('Error en getAll carreras:', error);
      throw new Error(error.message);
    }
    return data;
  },

  async getById(id: number): Promise<Carrera | null> {
    const { data, error } = await supabase
      .from('carreras')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(error.message);
    return data as Carrera;
  },

  async create(carrera: Carrera): Promise<Carrera> {
    const { data, error } = await supabase
      .from('carreras')
      .insert(carrera)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as Carrera;
  },

  async update(id: number, carrera: Partial<Carrera>): Promise<Carrera> {
    const { data, error } = await supabase
      .from('carreras')
      .update(carrera)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as Carrera;
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('carreras')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(error.message);
  }
};

// Servicios CRUD para horarios de maestros
export const horariosService = {
  async getAll(): Promise<HorarioMaestro[]> {
    const { data, error } = await supabase
      .from('horario-maestro')
      .select('*');
    
    if (error) throw new Error(error.message);
    return data as HorarioMaestro[];
  },

  async getById(id: number): Promise<HorarioMaestro | null> {
    const { data, error } = await supabase
      .from('horario-maestro')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(error.message);
    return data as HorarioMaestro;
  },

  async getByMaestro(maestroId: number): Promise<HorarioMaestro[]> {
    const { data, error } = await supabase
      .from('horario-maestro')
      .select('*')
      .eq('maestro_id', maestroId);
    
    if (error) throw new Error(error.message);
    return data as HorarioMaestro[];
  },

  async getByGrupo(grupoId: number): Promise<HorarioMaestro[]> {
    const { data, error } = await supabase
      .from('horario-maestro')
      .select('*')
      .eq('grupo_id', grupoId);
    
    if (error) throw new Error(error.message);
    return data as HorarioMaestro[];
  },

  async verificarHorarioMaestro(maestroId: number, dia: string, hora: string, horarioId?: number): Promise<boolean> {
    const query = supabase
      .from('horario-maestro')
      .select('*')
      .eq('maestro_id', maestroId)
      .eq('dia', dia)
      .eq('hora', hora);
    
    // Si estamos editando un horario existente, excluimos ese horario de la verificación
    if (horarioId) {
      query.neq('id', horarioId);
    }

    const { data, error } = await query;
    
    if (error) throw new Error(error.message);
    return data.length > 0; // Retorna true si ya existe un horario
  },

  async verificarHorarioGrupo(grupoId: number, dia: string, hora: string, horarioId?: number): Promise<boolean> {
    const query = supabase
      .from('horario-maestro')
      .select('*')
      .eq('grupo_id', grupoId)
      .eq('dia', dia)
      .eq('hora', hora);
    
    // Si estamos editando un horario existente, excluimos ese horario de la verificación
    if (horarioId) {
      query.neq('id', horarioId);
    }

    const { data, error } = await query;
    
    if (error) throw new Error(error.message);
    return data.length > 0; // Retorna true si ya existe un horario
  },

  async create(horario: HorarioMaestro): Promise<HorarioMaestro> {
    // Verificar si el maestro ya tiene clase en ese horario
    const maestroOcupado = await this.verificarHorarioMaestro(
      horario.maestro_id,
      horario.dia,
      horario.hora
    );
    
    if (maestroOcupado) {
      throw new Error('El maestro ya tiene una clase asignada en este horario');
    }

    // Verificar si el grupo ya tiene clase en ese horario
    const grupoOcupado = await this.verificarHorarioGrupo(
      horario.grupo_id,
      horario.dia,
      horario.hora
    );
    
    if (grupoOcupado) {
      throw new Error('El grupo ya tiene una clase asignada en este horario');
    }

    // Si no hay conflictos, crear el horario
    const { data, error } = await supabase
      .from('horario-maestro')
      .insert(horario)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as HorarioMaestro;
  },

  async update(id: number, horario: Partial<HorarioMaestro>): Promise<HorarioMaestro> {
    // Si se está actualizando el día u hora, verificar conflictos
    if (horario.dia || horario.hora) {
      const horarioActual = await this.getById(id);
      if (!horarioActual) throw new Error('Horario no encontrado');

      const diaVerificar = horario.dia || horarioActual.dia;
      const horaVerificar = horario.hora || horarioActual.hora;

      // Verificar conflictos con otros horarios del maestro
      const maestroOcupado = await this.verificarHorarioMaestro(
        horario.maestro_id || horarioActual.maestro_id,
        diaVerificar,
        horaVerificar,
        id // Excluir el horario actual de la verificación
      );
      
      if (maestroOcupado) {
        throw new Error('El maestro ya tiene una clase asignada en este horario');
      }

      // Verificar conflictos con otros horarios del grupo
      const grupoOcupado = await this.verificarHorarioGrupo(
        horario.grupo_id || horarioActual.grupo_id,
        diaVerificar,
        horaVerificar,
        id // Excluir el horario actual de la verificación
      );
      
      if (grupoOcupado) {
        throw new Error('El grupo ya tiene una clase asignada en este horario');
      }
    }

    // Si no hay conflictos, actualizar el horario
    const { data, error } = await supabase
      .from('horario-maestro')
      .update(horario)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as HorarioMaestro;
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('horario-maestro')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(error.message);
  },
  
  async registrarAsistencia(id: number, asistio: boolean): Promise<HorarioMaestro> {
    const { data, error } = await supabase
      .from('horario-maestro')
      .update({ asistencia: asistio })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as HorarioMaestro;
  }
};

export const authService = {
  async ejecutarInsercionAutomatica() {
    const { data, error } = await supabase
      .rpc('insertar_asistencia_auto');
    
    if (error) throw new Error(error.message);
    return data;
  }
};

export const edificiosService = {
  async getAll(): Promise<Edificio[]> {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      throw new Error('No hay sesión activa');
    }

    const user = JSON.parse(userStr);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const { data, error } = await supabase
      .from('edificios')
      .select('*')
      .order('facultad', { ascending: true });
    
    if (error) {
      console.error('Error en getAll edificios:', error);
      throw new Error(error.message);
    }
    return data as Edificio[];
  },

  async verificarEdificioUnico(facultad: string, nombre?: string): Promise<boolean> {
    let query = supabase
      .from('edificios')
      .select('id')
      .eq('facultad', facultad);
    
    if (nombre) {
      query = query.or(`nombre.eq.${nombre}`);
    }

    const { data, error } = await query;
    
    if (error) throw new Error('Error al verificar edificio: ' + error.message);
    return data.length === 0; // Retorna true si el edificio NO está duplicado
  },

  async create(edificio: Edificio): Promise<Edificio> {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      throw new Error('No hay sesión activa');
    }

    const user = JSON.parse(userStr);
    if (!user || user.role !== 'Administrador') {
      throw new Error('No tiene permisos para crear edificios');
    }

    // Verificar si el edificio ya existe
    const esUnico = await this.verificarEdificioUnico(edificio.facultad, edificio.nombre);
    if (!esUnico) {
      throw new Error('Ya existe un edificio con la misma facultad o nombre');
    }

    const { data, error } = await supabase
      .from('edificios')
      .insert(edificio)
      .select()
      .single();
    
    if (error) {
      console.error('Error en create edificio:', error);
      throw new Error(error.message);
    }
    return data as Edificio;
  },

  async update(id: number, edificio: Edificio): Promise<Edificio> {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      throw new Error('No hay sesión activa');
    }

    const user = JSON.parse(userStr);
    if (!user || user.role !== 'Administrador') {
      throw new Error('No tiene permisos para actualizar edificios');
    }

    const { data, error } = await supabase
      .from('edificios')
      .update(edificio)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error en update edificio:', error);
      throw error;
    }
    return data;
  },

  async delete(id: number): Promise<void> {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      throw new Error('No hay sesión activa');
    }

    const user = JSON.parse(userStr);
    if (!user || user.role !== 'Administrador') {
      throw new Error('No tiene permisos para eliminar edificios');
    }

    const { error } = await supabase
      .from('edificios')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error en delete edificio:', error);
      throw new Error(error.message);
    }
  }
};

export const asistenciasService = {
  async getAsistenciasPorRango(maestroId: string, fechaInicio: string, fechaFin: string, role: string) {
    try {
      // Obtener los horarios primero
      const { data: horarios, error: horarioError } = await supabase
        .from('horario-maestro')
        .select(`
          id,
          hora,
          dia,
          materia_id,
          grupo_id,
          maestro:usuarios (
            name
          ),
          grupo:grupo (
            name,
            classroom,
            building
          ),
          materia:materias (
            name
          )
        `)
        .eq('maestro_id', maestroId);

      if (horarioError) throw horarioError;
      
      const horarioIds = horarios?.map(h => h.id) || [];

      // Obtener asistencias según el rol seleccionado
      let asistencias;
      switch (role) {
        case 'Maestro':
          const { data: maestroData } = await supabase
            .from('asistencia_maestro')
            .select('*')
            .in('horario_id', horarioIds)
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin);
          asistencias = (maestroData || []).map(a => ({ ...a, registradoPor: 'Maestro' }));
          break;
        case 'Jefe_de_Grupo':
          const { data: jefeData } = await supabase
            .from('asistencia_jefe')
            .select('*')
            .in('horario_id', horarioIds)
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin);
          asistencias = (jefeData || []).map(a => ({ ...a, registradoPor: 'Jefe_de_Grupo' }));
          break;
        case 'Checador':
          const { data: checadorData } = await supabase
            .from('asistencia_checador')
            .select('*')
            .in('horario_id', horarioIds)
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin);
          asistencias = (checadorData || []).map(a => ({ ...a, registradoPor: 'Checador' }));
          break;
        default:
          asistencias = [];
      }

      // Combinar información
      return asistencias.map(asistencia => {
        const horario = horarios?.find(h => h.id === asistencia.horario_id);
        return {
          id: asistencia.id,
          fecha: asistencia.fecha,
          hora: horario?.hora,
          materiaNombre: horario?.materia?.name || 'No asignada',
          grupoInfo: horario?.grupo ? 
            `${horario.grupo.name} (${horario.grupo.classroom} - ${horario.grupo.building})` : 
            'No asignado',
          asistencia: asistencia.asistencia,
          registradoPor: asistencia.registradoPor
        };
      });

    } catch (error) {
      console.error('Error en getAsistenciasPorRango:', error);
      throw error;
    }
  },

  async getAsistenciasJefePorRango(jefeNoCuenta: string, fechaInicio: string, fechaFin: string) {
    try {
      // Primero obtenemos el grupo del jefe
      const { data: grupo, error: grupoError } = await supabase
        .from('grupo')
        .select('id')
        .eq('jefe_nocuenta', jefeNoCuenta)
        .single();

      if (grupoError) throw grupoError;
      if (!grupo) return [];

      // Obtenemos los horarios del grupo
      const { data: horarios, error: horarioError } = await supabase
        .from('horario-maestro')
        .select(`
          id,
          hora,
          dia,
          materia_id,
          grupo_id,
          grupo:grupo (
            name,
            classroom,
            building
          ),
          materia:materias (
            name
          )
        `)
        .eq('grupo_id', grupo.id);

      if (horarioError) throw horarioError;
      if (!horarios?.length) return [];

      const horarioIds = horarios.map(h => h.id);

      // Obtenemos las asistencias del jefe
      const { data: asistencias, error: asistenciaError } = await supabase
        .from('asistencia_jefe')
        .select('*')
        .in('horario_id', horarioIds)
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin);

      if (asistenciaError) throw asistenciaError;

      // Combinamos la información
      return asistencias.map(asistencia => {
        const horario = horarios.find(h => h.id === asistencia.horario_id);
        return {
          id: asistencia.id,
          fecha: asistencia.fecha,
          hora: horario?.hora,
          materiaNombre: horario?.materia?.name || 'No asignada',
          grupoInfo: horario?.grupo ? `${horario.grupo.name} (${horario.grupo.classroom} - ${horario.grupo.building})` : 'No asignado',
          asistencia: asistencia.asistencia
        };
      });
    } catch (error) {
      console.error('Error en getAsistenciasJefePorRango:', error);
      throw error;
    }
  },

  async getAsistenciasChecadorPorRango(checadorId: string, fechaInicio: string, fechaFin: string) {
    try {
      // Obtenemos todas las asistencias registradas por el checador
      const { data: asistencias, error: asistenciaError } = await supabase
        .from('asistencia_checador')
        .select(`
          *,
          horario:horario-maestro (
            hora,
            dia,
            materia_id,
            grupo_id,
            grupo:grupo (
              name,
              classroom,
              building
            ),
            materia:materias (
              name
            )
          )
        `)
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin);

      if (asistenciaError) throw asistenciaError;
      if (!asistencias?.length) return [];

      // Combinamos la información
      return asistencias.map(asistencia => ({
        id: asistencia.id,
        fecha: asistencia.fecha,
        hora: asistencia.horario?.hora,
        materiaNombre: asistencia.horario?.materia?.name || 'No asignada',
        grupoInfo: asistencia.horario?.grupo ? 
          `${asistencia.horario.grupo.name} (${asistencia.horario.grupo.classroom} - ${asistencia.horario.grupo.building})` : 
          'No asignado',
        asistencia: asistencia.asistencia
      }));
    } catch (error) {
      console.error('Error en getAsistenciasChecadorPorRango:', error);
      throw error;
    }
  },

  async getAsistenciasPorGrupo(grupoId: string, fechaInicio: string, fechaFin: string) {
    try {
      // Primero obtenemos todos los horarios del grupo
      const { data: horarios, error: horarioError } = await supabase
        .from('horario-maestro')
        .select(`
          id,
          hora,
          dia,
          maestro_id,
          maestro:usuarios!horario-maestro_maestro_id_fkey (
            id,
            name
          ),
          materia:materias (
            id,
            name
          )
        `)
        .eq('grupo_id', grupoId);

      if (horarioError) throw horarioError;
      if (!horarios?.length) return [];

      const horarioIds = horarios.map(h => h.id);

      // Obtener asistencias de las tres tablas
      const [maestroData, jefeData, checadorData] = await Promise.all([
        supabase
          .from('asistencia_maestro')
          .select('*')
          .in('horario_id', horarioIds)
          .gte('fecha', fechaInicio)
          .lte('fecha', fechaFin),
        supabase
          .from('asistencia_jefe')
          .select('*')
          .in('horario_id', horarioIds)
          .gte('fecha', fechaInicio)
          .lte('fecha', fechaFin),
        supabase
          .from('asistencia_checador')
          .select('*')
          .in('horario_id', horarioIds)
          .gte('fecha', fechaInicio)
          .lte('fecha', fechaFin)
      ]);

      // Procesar cada tipo de registro por separado
      const procesarAsistencias = (asistencias: any[], tipo: string) => {
        return horarios.reduce((acc: any, horario) => {
          const maestroId = horario.maestro?.id;
          if (!maestroId) return acc;

          const key = `${maestroId}-${tipo}`;
          if (!acc[key]) {
            acc[key] = {
              maestroId,
              maestroNombre: horario.maestro?.name || 'Sin nombre',
              materias: new Set(),
              total: 0,
              asistencias: 0,
              faltas: 0,
              tipoRegistro: tipo
            };
          }

          acc[key].materias.add(horario.materia?.name);

          const asistenciasHorario = asistencias.filter(a => a.horario_id === horario.id);
          asistenciasHorario.forEach(asistencia => {
            acc[key].total++;
            if (asistencia.asistencia?.toLowerCase() === 'presente') {
              acc[key].asistencias++;
            } else {
              acc[key].faltas++;
            }
          });

          return acc;
        }, {});
      };

      const maestroStats = procesarAsistencias(maestroData.data || [], 'maestro');
      const jefeStats = procesarAsistencias(jefeData.data || [], 'jefe');
      const checadorStats = procesarAsistencias(checadorData.data || [], 'checador');

      // Combinar todos los resultados
      const todosLosStats = {
        ...maestroStats,
        ...jefeStats,
        ...checadorStats
      };

      return Object.values(todosLosStats).map((stats: any) => ({
        ...stats,
        materias: Array.from(stats.materias).join(', '),
        porcentaje: stats.total > 0 
          ? Math.round((stats.asistencias / stats.total) * 100) 
          : 0
      }));

    } catch (error) {
      console.error('Error en getAsistenciasPorGrupo:', error);
      throw error;
    }
  }
}; 