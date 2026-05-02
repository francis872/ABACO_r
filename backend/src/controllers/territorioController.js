const { validationResult } = require('express-validator');
const { consultar } = require('../config/database');

// =====================================================
// TERRITORIOS
// =====================================================

const listarTerritorios = async (req, res, next) => {
  try {
    const { nivel, padre_id, buscar } = req.query;
    let condiciones = [];
    let parametros = [];
    let cnt = 1;

    if (nivel) { condiciones.push(`nivel = $${cnt++}`); parametros.push(nivel); }
    if (padre_id) { condiciones.push(`padre_id = $${cnt++}`); parametros.push(padre_id); }
    if (buscar) {
      condiciones.push(`(nombre ILIKE $${cnt} OR codigo ILIKE $${cnt})`);
      parametros.push(`%${buscar}%`);
      cnt++;
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const resultado = await consultar(
      `SELECT t.*, p.nombre AS padre_nombre
       FROM territorios t
       LEFT JOIN territorios p ON t.padre_id = p.id
       ${where} ORDER BY t.nivel, t.nombre`,
      parametros
    );

    res.json({ exito: true, total: resultado.rowCount, territorios: resultado.rows });
  } catch (error) { next(error); }
};

const obtenerTerritorioPorId = async (req, res, next) => {
  try {
    const resultado = await consultar(
      `SELECT t.*, p.nombre AS padre_nombre,
              (SELECT COUNT(*) FROM territorios WHERE padre_id = t.id) AS hijos_count
       FROM territorios t
       LEFT JOIN territorios p ON t.padre_id = p.id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Territorio no encontrado' });
    }
    res.json({ exito: true, territorio: resultado.rows[0] });
  } catch (error) { next(error); }
};

const crearTerritorio = async (req, res, next) => {
  try {
    const errores = validationResult(req);
    if (!errores.isEmpty()) return res.status(400).json({ exito: false, errores: errores.array() });

    const { codigo, nombre, nivel, padre_id, latitud, longitud, geojson, poblacion, votantes_censo, prioridad, notas } = req.body;

    const resultado = await consultar(
      `INSERT INTO territorios (codigo, nombre, nivel, padre_id, latitud, longitud, geojson, poblacion, votantes_censo, prioridad, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [codigo, nombre, nivel, padre_id || null, latitud, longitud, geojson ? JSON.stringify(geojson) : null, poblacion, votantes_censo, prioridad || 3, notas]
    );

    res.status(201).json({ exito: true, mensaje: 'Territorio creado', territorio: resultado.rows[0] });
  } catch (error) { next(error); }
};

const actualizarTerritorio = async (req, res, next) => {
  try {
    const { nombre, codigo, latitud, longitud, geojson, poblacion, votantes_censo, prioridad, notas } = req.body;

    const resultado = await consultar(
      `UPDATE territorios SET
         nombre = COALESCE($1, nombre),
         codigo = COALESCE($2, codigo),
         latitud = COALESCE($3, latitud),
         longitud = COALESCE($4, longitud),
         geojson = COALESCE($5, geojson),
         poblacion = COALESCE($6, poblacion),
         votantes_censo = COALESCE($7, votantes_censo),
         prioridad = COALESCE($8, prioridad),
         notas = COALESCE($9, notas),
         updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [nombre, codigo, latitud, longitud, geojson ? JSON.stringify(geojson) : null, poblacion, votantes_censo, prioridad, notas, req.params.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Territorio no encontrado' });
    }
    res.json({ exito: true, territorio: resultado.rows[0] });
  } catch (error) { next(error); }
};

const eliminarTerritorio = async (req, res, next) => {
  try {
    const resultado = await consultar('DELETE FROM territorios WHERE id = $1 RETURNING id', [req.params.id]);
    if (resultado.rows.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Territorio no encontrado' });
    }
    res.json({ exito: true, mensaje: 'Territorio eliminado' });
  } catch (error) { next(error); }
};

// =====================================================
// RESULTADOS ELECTORALES
// =====================================================

const listarResultados = async (req, res, next) => {
  try {
    const { eleccion_id, territorio_id } = req.query;
    let condiciones = [];
    let parametros = [];
    let cnt = 1;

    if (eleccion_id) { condiciones.push(`re.eleccion_id = $${cnt++}`); parametros.push(eleccion_id); }
    if (territorio_id) { condiciones.push(`re.territorio_id = $${cnt++}`); parametros.push(territorio_id); }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const resultado = await consultar(
      `SELECT re.*, t.nombre AS territorio_nombre, e.nombre AS eleccion_nombre
       FROM resultados_electorales re
       LEFT JOIN territorios t ON re.territorio_id = t.id
       LEFT JOIN elecciones e ON re.eleccion_id = e.id
       ${where} ORDER BY re.votos DESC`,
      parametros
    );

    res.json({ exito: true, total: resultado.rowCount, resultados: resultado.rows });
  } catch (error) { next(error); }
};

const crearResultado = async (req, res, next) => {
  try {
    const errores = validationResult(req);
    if (!errores.isEmpty()) return res.status(400).json({ exito: false, errores: errores.array() });

    const { eleccion_id, territorio_id, candidato, partido, votos, porcentaje, votos_nulos, votos_blancos, total_votantes, abstencion } = req.body;

    const resultado = await consultar(
      `INSERT INTO resultados_electorales
         (eleccion_id, territorio_id, candidato, partido, votos, porcentaje, votos_nulos, votos_blancos, total_votantes, abstencion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [eleccion_id, territorio_id, candidato, partido, votos, porcentaje, votos_nulos, votos_blancos, total_votantes, abstencion]
    );

    res.status(201).json({ exito: true, resultado: resultado.rows[0] });
  } catch (error) { next(error); }
};

// =====================================================
// ELECCIONES
// =====================================================

const listarElecciones = async (req, res, next) => {
  try {
    const resultado = await consultar(
      'SELECT * FROM elecciones ORDER BY fecha DESC'
    );
    res.json({ exito: true, elecciones: resultado.rows });
  } catch (error) { next(error); }
};

const crearEleccion = async (req, res, next) => {
  try {
    const { nombre, tipo, fecha, descripcion, activa } = req.body;
    const resultado = await consultar(
      `INSERT INTO elecciones (nombre, tipo, fecha, descripcion, activa)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [nombre, tipo, fecha, descripcion, activa || false]
    );
    res.status(201).json({ exito: true, eleccion: resultado.rows[0] });
  } catch (error) { next(error); }
};

module.exports = {
  listarTerritorios, obtenerTerritorioPorId, crearTerritorio, actualizarTerritorio, eliminarTerritorio,
  listarResultados, crearResultado,
  listarElecciones, crearEleccion,
};
