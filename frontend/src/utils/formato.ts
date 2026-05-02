/**
 * Formatea un número como peso colombiano (COP)
 */
export function formatearPeso(monto: number | string | null | undefined): string {
  const num = parseFloat(String(monto || 0))
  if (isNaN(num)) return '$0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

/**
 * Formatea una fecha ISO a formato legible en español
 */
export function formatearFecha(fecha: string, incluirHora = false): string {
  if (!fecha) return '—'
  try {
    const opciones: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: 'short', day: 'numeric',
    }
    if (incluirHora) {
      opciones.hour = '2-digit'
      opciones.minute = '2-digit'
    }
    return new Date(fecha).toLocaleDateString('es-CO', opciones)
  } catch {
    return fecha
  }
}

/**
 * Trunca un texto a una longitud máxima
 */
export function truncar(texto: string, max = 60): string {
  if (!texto) return ''
  return texto.length > max ? texto.slice(0, max) + '…' : texto
}

/**
 * Retorna una clase de color Tailwind según la severidad
 */
export function colorSeveridad(severidad: string): string {
  const mapa: Record<string, string> = {
    critica: 'badge-rojo',
    alta:    'badge-naranja',
    media:   'badge-oro',
    baja:    'badge-verde',
  }
  return mapa[severidad] || 'badge-gris'
}

/**
 * Retorna una clase de color según el estado de una tarea
 */
export function colorEstadoTarea(estado: string): string {
  const mapa: Record<string, string> = {
    pendiente:   'badge-naranja',
    en_progreso: 'badge-azul',
    completada:  'badge-verde',
    cancelada:   'badge-gris',
  }
  return mapa[estado] || 'badge-gris'
}
