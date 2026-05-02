const { consultar } = require('../config/database');

// =====================================================
// ANÁLISIS TERRITORIAL
// =====================================================

/**
 * GET /api/analisis/territorial
 * Cruce de datos electorales con indicadores por territorio.
 */
const analisisTerritorial = async (req, res, next) => {
  try {
    const { eleccion_id, nivel } = req.query;
    let parametros = [];
    let cnt = 1;
    const condiciones = [];

    if (eleccion_id) { condiciones.push(`re.eleccion_id = $${cnt++}`); parametros.push(eleccion_id); }
    if (nivel) { condiciones.push(`t.nivel = $${cnt++}`); parametros.push(nivel); }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const resultado = await consultar(`
      SELECT
        t.id, t.nombre AS territorio, t.nivel, t.prioridad,
        t.votantes_censo, t.poblacion,
        SUM(re.votos) AS total_votos,
        AVG(re.porcentaje) AS promedio_porcentaje,
        AVG(re.abstencion) AS abstencion_promedio,
        COUNT(DISTINCT c.id) AS contactos_registrados,
        SUM(CASE WHEN c.voluntario THEN 1 ELSE 0 END) AS voluntarios,
        SUM(CASE WHEN c.lider_comunitario THEN 1 ELSE 0 END) AS lideres
      FROM territorios t
      LEFT JOIN resultados_electorales re ON re.territorio_id = t.id
      LEFT JOIN contactos c ON c.territorio_id = t.id
      ${where}
      GROUP BY t.id, t.nombre, t.nivel, t.prioridad, t.votantes_censo, t.poblacion
      ORDER BY total_votos DESC NULLS LAST
    `, parametros);

    res.json({ exito: true, analisis: resultado.rows });
  } catch (error) { next(error); }
};

/**
 * GET /api/analisis/comparativo
 * Comparación entre territorios para un indicador específico.
 */
const analisisComparativo = async (req, res, next) => {
  try {
    const { indicador_id, nivel } = req.query;

    const resultado = await consultar(`
      SELECT
        t.nombre AS territorio, t.nivel,
        vi.valor, vi.periodo, vi.fecha
      FROM valores_indicadores vi
      JOIN territorios t ON vi.territorio_id = t.id
      WHERE ($1::uuid IS NULL OR vi.indicador_id = $1)
        AND ($2::nivel_territorial IS NULL OR t.nivel = $2::nivel_territorial)
      ORDER BY vi.valor DESC NULLS LAST
    `, [indicador_id || null, nivel || null]);

    res.json({ exito: true, comparativo: resultado.rows });
  } catch (error) { next(error); }
};

/**
 * GET /api/analisis/tendencias
 * Evolución temporal de un indicador o resultado electoral.
 */
const analizarTendencias = async (req, res, next) => {
  try {
    const { indicador_id, territorio_id } = req.query;

    const resultado = await consultar(`
      SELECT vi.valor, vi.fecha, vi.periodo,
             i.nombre AS indicador, t.nombre AS territorio
      FROM valores_indicadores vi
      JOIN indicadores i ON vi.indicador_id = i.id
      JOIN territorios t ON vi.territorio_id = t.id
      WHERE ($1::uuid IS NULL OR vi.indicador_id = $1)
        AND ($2::uuid IS NULL OR vi.territorio_id = $2)
      ORDER BY vi.fecha ASC
    `, [indicador_id || null, territorio_id || null]);

    res.json({ exito: true, tendencias: resultado.rows });
  } catch (error) { next(error); }
};

/**
 * GET /api/analisis/financiero
 * Análisis financiero de la campaña.
 */
const analisisFinanciero = async (req, res, next) => {
  try {
    const [porCategoria, porMes, resumen] = await Promise.all([
      consultar(`
        SELECT cg.nombre AS categoria, cg.color,
               SUM(tr.monto) AS total,
               COUNT(*) AS cantidad
        FROM transacciones tr
        JOIN categorias_gasto cg ON tr.categoria_id = cg.id
        WHERE tr.tipo = 'egreso'
        GROUP BY cg.id, cg.nombre, cg.color
        ORDER BY total DESC
      `),
      consultar(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', fecha), 'Mon YY') AS mes,
          TO_CHAR(DATE_TRUNC('month', fecha), 'YYYY-MM') AS mes_orden,
          SUM(CASE WHEN tipo IN ('ingreso','donacion') THEN monto ELSE 0 END) AS ingresos,
          SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) AS egresos
        FROM transacciones
        GROUP BY mes, mes_orden ORDER BY mes_orden ASC
      `),
      consultar(`
        SELECT
          SUM(CASE WHEN tipo IN ('ingreso','donacion') THEN monto ELSE 0 END) AS total_ingresos,
          SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) AS total_egresos,
          SUM(CASE WHEN tipo = 'donacion' THEN monto ELSE 0 END) AS total_donaciones,
          COUNT(*) AS total_transacciones
        FROM transacciones
      `),
    ]);

    res.json({
      exito: true,
      financiero: {
        porCategoria: porCategoria.rows,
        evolucionMensual: porMes.rows,
        resumen: resumen.rows[0],
      },
    });
  } catch (error) { next(error); }
};

/**
 * POST /api/analisis/simulacion
 * Simulación de escenario electoral.
 */
const simularEscenario = async (req, res, next) => {
  try {
    const { territorio_id, incremento_participacion, crecimiento_apoyo } = req.body;

    // Obtener datos base del territorio
    const base = await consultar(`
      SELECT t.votantes_censo,
             AVG(re.porcentaje) AS porcentaje_promedio,
             AVG(re.abstencion) AS abstencion_promedio,
             SUM(re.votos) AS votos_historicos
      FROM territorios t
      LEFT JOIN resultados_electorales re ON re.territorio_id = t.id
      WHERE t.id = $1
      GROUP BY t.votantes_censo
    `, [territorio_id]);

    if (base.rows.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Territorio no encontrado' });
    }

    const datos = base.rows[0];
    const votantes = datos.votantes_censo || 0;
    const participacionBase = 100 - (parseFloat(datos.abstencion_promedio) || 35);
    const apoyoBase = parseFloat(datos.porcentaje_promedio) || 30;

    const participacionProyectada = Math.min(participacionBase + (incremento_participacion || 0), 100);
    const apoyoProyectado = Math.min(apoyoBase + (crecimiento_apoyo || 0), 100);
    const votantesEfectivos = Math.round(votantes * (participacionProyectada / 100));
    const votosProyectados = Math.round(votantesEfectivos * (apoyoProyectado / 100));

    res.json({
      exito: true,
      simulacion: {
        territorio_id,
        votantes_censo: votantes,
        escenario_base: {
          participacion: participacionBase.toFixed(1),
          apoyo: apoyoBase.toFixed(1),
          votos_estimados: datos.votos_historicos,
        },
        escenario_proyectado: {
          participacion: participacionProyectada.toFixed(1),
          apoyo: apoyoProyectado.toFixed(1),
          votantes_efectivos: votantesEfectivos,
          votos_proyectados: votosProyectados,
          incremento_votos: votosProyectados - (datos.votos_historicos || 0),
        },
      },
    });
  } catch (error) { next(error); }
};

// =====================================================
// ALERTAS
// =====================================================

const listarAlertas = async (req, res, next) => {
  try {
    const { resuelta, severidad } = req.query;
    let condiciones = [];
    let parametros = [];
    let cnt = 1;

    if (resuelta !== undefined) { condiciones.push(`resuelta = $${cnt++}`); parametros.push(resuelta === 'true'); }
    if (severidad) { condiciones.push(`severidad = $${cnt++}`); parametros.push(severidad); }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const resultado = await consultar(
      `SELECT a.*, t.nombre AS territorio_nombre, u.nombre || ' ' || u.apellido AS creado_por_nombre
       FROM alertas a
       LEFT JOIN territorios t ON a.territorio_id = t.id
       LEFT JOIN usuarios u ON a.creado_por = u.id
       ${where} ORDER BY
         CASE severidad WHEN 'critica' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END,
         a.created_at DESC`,
      parametros
    );
    res.json({ exito: true, alertas: resultado.rows });
  } catch (error) { next(error); }
};

const crearAlerta = async (req, res, next) => {
  try {
    const { titulo, descripcion, severidad, territorio_id, tipo } = req.body;
    const resultado = await consultar(
      `INSERT INTO alertas (titulo, descripcion, severidad, territorio_id, tipo, creado_por)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [titulo, descripcion, severidad || 'media', territorio_id || null, tipo, req.usuario.id]
    );
    res.status(201).json({ exito: true, alerta: resultado.rows[0] });
  } catch (error) { next(error); }
};

const resolverAlerta = async (req, res, next) => {
  try {
    const resultado = await consultar(
      `UPDATE alertas SET resuelta = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (resultado.rows.length === 0) return res.status(404).json({ exito: false, mensaje: 'Alerta no encontrada' });
    res.json({ exito: true, alerta: resultado.rows[0] });
  } catch (error) { next(error); }
};

// =====================================================
// FINANCIERO
// =====================================================

const listarTransacciones = async (req, res, next) => {
  try {
    const { tipo, categoria_id, presupuesto_id } = req.query;
    let condiciones = [];
    let parametros = [];
    let cnt = 1;

    if (tipo) { condiciones.push(`tr.tipo = $${cnt++}`); parametros.push(tipo); }
    if (categoria_id) { condiciones.push(`tr.categoria_id = $${cnt++}`); parametros.push(categoria_id); }
    if (presupuesto_id) { condiciones.push(`tr.presupuesto_id = $${cnt++}`); parametros.push(presupuesto_id); }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const resultado = await consultar(
      `SELECT tr.*, cg.nombre AS categoria_nombre, cg.color AS categoria_color,
              u.nombre || ' ' || u.apellido AS registrado_por_nombre
       FROM transacciones tr
       LEFT JOIN categorias_gasto cg ON tr.categoria_id = cg.id
       LEFT JOIN usuarios u ON tr.registrado_por = u.id
       ${where} ORDER BY tr.fecha DESC, tr.created_at DESC`,
      parametros
    );
    res.json({ exito: true, transacciones: resultado.rows });
  } catch (error) { next(error); }
};

const crearTransaccion = async (req, res, next) => {
  try {
    const { presupuesto_id, categoria_id, tipo, monto, descripcion, fecha, referencia } = req.body;
    const resultado = await consultar(
      `INSERT INTO transacciones (presupuesto_id, categoria_id, tipo, monto, descripcion, fecha, referencia, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [presupuesto_id || null, categoria_id || null, tipo, monto, descripcion, fecha, referencia, req.usuario.id]
    );
    res.status(201).json({ exito: true, transaccion: resultado.rows[0] });
  } catch (error) { next(error); }
};

module.exports = {
  analisisTerritorial, analisisComparativo, analizarTendencias,
  analisisFinanciero, simularEscenario,
  listarAlertas, crearAlerta, resolverAlerta,
  listarTransacciones, crearTransaccion,
};
