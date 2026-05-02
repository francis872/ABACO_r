// ============================================================
// Tipos centrales de ÁBACO
// ============================================================

export type RolUsuario = 'superadmin' | 'admin' | 'estratega' | 'analista' | 'coordinador' | 'observador';

export interface Usuario {
  id: string;
  nombre: string;
  apellido?: string;
  email: string;
  rol: RolUsuario;
  activo?: boolean;
  cargo?: string;
  departamento?: string;
  telefono?: string;
  ultimo_acceso?: string;
  created_at?: string;
}

export interface AuthState {
  usuario: Usuario | null;
  token: string | null;
  autenticado: boolean;
  cargando: boolean;
}

export type NivelTerritorial = 'pais' | 'departamento' | 'municipio' | 'localidad' | 'barrio' | 'zona' | 'sector' | 'mesa';

export interface Territorio {
  id: string;
  codigo?: string;
  nombre: string;
  nivel: NivelTerritorial;
  padre_id?: string;
  padre_nombre?: string;
  latitud?: number;
  longitud?: number;
  geojson?: GeoJSON.FeatureCollection;
  poblacion?: number;
  votantes_censo?: number;
  prioridad?: number;
  notas?: string;
  hijos_count?: number;
}

export interface ResultadoElectoral {
  id: string;
  eleccion_id: string;
  eleccion_nombre?: string;
  territorio_id: string;
  territorio_nombre?: string;
  candidato: string;
  partido?: string;
  votos: number;
  porcentaje?: number;
  votos_nulos?: number;
  votos_blancos?: number;
  total_votantes?: number;
  abstencion?: number;
}

export interface Eleccion {
  id: string;
  nombre: string;
  tipo?: string;
  fecha?: string;
  descripcion?: string;
  activa: boolean;
}

export interface Contacto {
  id: string;
  nombres: string;
  apellidos?: string;
  documento?: string;
  telefono?: string;
  email?: string;
  territorio_id?: string;
  territorio_nombre?: string;
  tipo: string;
  lider_comunitario: boolean;
  simpatizante: boolean;
  voluntario: boolean;
  notas?: string;
  created_at?: string;
}

export interface Campana {
  id: string;
  nombre: string;
  descripcion?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado: string;
  presupuesto?: number;
  activa: boolean;
  equipos_count?: number;
  tareas_count?: number;
}

export type PrioridadTarea = 'baja' | 'media' | 'alta' | 'critica';
export type EstadoTarea = 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';

export interface Tarea {
  id: string;
  titulo: string;
  descripcion?: string;
  estado: EstadoTarea;
  prioridad: PrioridadTarea;
  asignado_a?: string;
  asignado_nombre?: string;
  campana_id?: string;
  campana_nombre?: string;
  territorio_id?: string;
  fecha_limite?: string;
  completada_en?: string;
  created_at?: string;
}

export type SeveridadAlerta = 'baja' | 'media' | 'alta' | 'critica';

export interface Alerta {
  id: string;
  titulo: string;
  descripcion?: string;
  severidad: SeveridadAlerta;
  territorio_id?: string;
  territorio_nombre?: string;
  tipo?: string;
  resuelta: boolean;
  resuelta_en?: string;
  creado_por?: string;
  created_at: string;
  updated_at?: string;
}

export type TipoTransaccion = 'ingreso' | 'egreso' | 'donacion';

export interface Transaccion {
  id: string;
  presupuesto_id?: string;
  categoria_id?: string;
  categoria_nombre?: string;
  categoria_color?: string;
  tipo: TipoTransaccion;
  monto: number;
  descripcion: string;
  fecha: string;
  referencia?: string;
  registrado_por_nombre?: string;
}

export interface ResumenDashboard {
  territorios: Array<{ nivel: string; total: number }>;
  contactos: { total: number; voluntarios: number; lideres: number };
  alertas: Array<{ severidad: string; total: number; activas: number }>;
  tareas: { total: number; pendientes: number; en_progreso: number; completadas: number };
  financiero: { total_ingresos: number; total_egresos: number; total_donaciones: number; total_transacciones: number };
  alertasRecientes: Alerta[];
  tareasRecientes: Tarea[];
  evolucionFinanciera: Array<{ mes: string; ingresos: number; egresos: number }>;
}

// Respuesta genérica de la API
export interface RespuestaAPI<T = unknown> {
  exito: boolean;
  mensaje?: string;
  data?: T;
}

// Paginación
export interface Paginado<T> {
  total: number;
  pagina: number;
  limite: number;
  datos: T[];
}

// ── Módulo Social ────────────────────────────────────────────────────────────

export type TipoAdjunto = 'imagen' | 'pdf';

export interface Adjunto {
  id: string;
  tipo: TipoAdjunto;
  url: string;
  nombre_original: string;
  tamano_bytes?: number;
}

export interface Publicacion {
  id: string;
  contenido: string;
  territorio_id?: string;
  territorio_nombre?: string;
  created_at: string;
  usuario_id: string;
  usuario_nombre: string;
  usuario_apellido: string;
  usuario_rol: RolUsuario;
  likes: number;
  comentarios: number;
  yo_di_like: boolean;
  adjuntos: Adjunto[];
}

export interface Comentario {
  id: string;
  publicacion_id: string;
  usuario_id: string;
  usuario_nombre: string;
  usuario_apellido: string;
  usuario_rol: RolUsuario;
  contenido: string;
  created_at: string;
}

export type TipoNotificacion = 'like' | 'comentario';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  publicacion_id?: string;
  actor_nombre: string;
  actor_apellido: string;
  leida: boolean;
  created_at: string;
}
