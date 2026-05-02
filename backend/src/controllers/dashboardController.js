const { consultar } = require('../config/database');

/**
 * GET /api/dashboard/resumen
 * Estadísticas generales para el panel principal.
 */
const obtenerResumen = async (req, res, next) => {
  try {
    const [
      totalesTerritorio,
      totalesContactos,
      totalesAlertas,
      totalesTareas,
      totalesTransacciones,
      alertasRecientes,
      tareasRecientes,
    ] = await Promise.all([
      consultar(`SELECT COUNT(*) AS total, nivel FROM territorios GROUP BY nivel`),
      consultar(`SELECT COUNT(*) AS total,
                        SUM(CASE WHEN voluntario THEN 1 ELSE 0 END) AS voluntarios,
                        SUM(CASE WHEN lider_comunitario THEN 1 ELSE 0 END) AS lideres
                 FROM contactos`),
      consultar(`SELECT COUNT(*) AS total,
                        SUM(CASE WHEN NOT resuelta THEN 1 ELSE 0 END) AS activas,
                        severidad, COUNT(*) OVER (PARTITION BY severidad) AS por_severidad
                 FROM alertas GROUP BY severidad`),
      consultar(`SELECT COUNT(*) AS total,
                        SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes,
                        SUM(CASE WHEN estado = 'en_progreso' THEN 1 ELSE 0 END) AS en_progreso,
                        SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) AS completadas
                 FROM tareas`),
      consultar(`SELECT
                   SUM(CASE WHEN tipo = 'ingreso' OR tipo = 'donacion' THEN monto ELSE 0 END) AS total_ingresos,
                   SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) AS total_egresos,
                   COUNT(*) AS total_transacciones
                 FROM transacciones`),
      consultar(`SELECT id, titulo, severidad, tipo, created_at
                 FROM alertas WHERE NOT resuelta
                 ORDER BY created_at DESC LIMIT 5`),
      consultar(`SELECT t.id, t.titulo, t.estado, t.prioridad, t.fecha_limite,
                        u.nombre || ' ' || u.apellido AS asignado_a
                 FROM tareas t
                 LEFT JOIN usuarios u ON t.asignado_a = u.id
                 WHERE t.estado != 'completada'
                 ORDER BY t.fecha_limite ASC NULLS LAST LIMIT 5`),
    ]);

    // Evolución mensual de transacciones (últimos 6 meses)
    const evolucionFinanciera = await consultar(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', fecha), 'YYYY-MM') AS mes,
        SUM(CASE WHEN tipo IN ('ingreso', 'donacion') THEN monto ELSE 0 END) AS ingresos,
        SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) AS egresos
      FROM transacciones
      WHERE fecha >= NOW() - INTERVAL '6 months'
      GROUP BY mes ORDER BY mes
    `);

    res.json({
      exito: true,
      resumen: {
        territorios:     totalesTerritorio.rows,
        contactos:       totalesContactos.rows[0],
        alertas:         totalesAlertas.rows,
        tareas:          totalesTareas.rows[0],
        financiero:      totalesTransacciones.rows[0],
        alertasRecientes: alertasRecientes.rows,
        tareasRecientes:  tareasRecientes.rows,
        evolucionFinanciera: evolucionFinanciera.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/indicadores
 * Indicadores KPI para el panel ejecutivo.
 */
const obtenerIndicadores = async (req, res, next) => {
  try {
    const resultado = await consultar(`
      SELECT i.id, i.nombre, i.unidad, i.categoria,
             v.valor, v.fecha, v.periodo,
             t.nombre AS territorio_nombre
      FROM indicadores i
      LEFT JOIN valores_indicadores v ON v.indicador_id = i.id
      LEFT JOIN territorios t ON v.territorio_id = t.id
      ORDER BY i.categoria, i.nombre, v.fecha DESC
    `);

    res.json({ exito: true, indicadores: resultado.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/actividad
 * Actividad reciente del sistema.
 */
const obtenerActividad = async (req, res, next) => {
  try {
    const [contactosRecientes, tareasCompletadas] = await Promise.all([
      consultar(`SELECT nombres, apellidos, tipo, created_at FROM contactos ORDER BY created_at DESC LIMIT 10`),
      consultar(`SELECT titulo, completada_en FROM tareas WHERE estado = 'completada' ORDER BY completada_en DESC LIMIT 10`),
    ]);

    res.json({
      exito: true,
      actividad: {
        contactosRecientes: contactosRecientes.rows,
        tareasCompletadas:  tareasCompletadas.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { obtenerResumen, obtenerIndicadores, obtenerActividad };
