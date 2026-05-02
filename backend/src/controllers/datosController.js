const { validationResult } = require('express-validator');
const { consultar } = require('../config/database');

// =====================================================
// CONTACTOS
// =====================================================

const listarContactos = async (req, res, next) => {
  try {
    const { territorio_id, tipo, voluntario, lider, buscar, pagina = 1, limite = 50 } = req.query;
    let condiciones = [];
    let parametros = [];
    let cnt = 1;

    if (territorio_id) { condiciones.push(`c.territorio_id = $${cnt++}`); parametros.push(territorio_id); }
    if (tipo) { condiciones.push(`c.tipo = $${cnt++}`); parametros.push(tipo); }
    if (voluntario !== undefined) { condiciones.push(`c.voluntario = $${cnt++}`); parametros.push(voluntario === 'true'); }
    if (lider !== undefined) { condiciones.push(`c.lider_comunitario = $${cnt++}`); parametros.push(lider === 'true'); }
    if (buscar) {
      condiciones.push(`(c.nombres ILIKE $${cnt} OR c.apellidos ILIKE $${cnt} OR c.documento ILIKE $${cnt} OR c.email ILIKE $${cnt})`);
      parametros.push(`%${buscar}%`);
      cnt++;
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const offset = (parseInt(pagina) - 1) * parseInt(limite);

    const [datos, totalResult] = await Promise.all([
      consultar(
        `SELECT c.*, t.nombre AS territorio_nombre
         FROM contactos c
         LEFT JOIN territorios t ON c.territorio_id = t.id
         ${where} ORDER BY c.created_at DESC
         LIMIT $${cnt} OFFSET $${cnt + 1}`,
        [...parametros, parseInt(limite), offset]
      ),
      consultar(`SELECT COUNT(*) AS total FROM contactos c ${where}`, parametros),
    ]);

    res.json({
      exito: true,
      total: parseInt(totalResult.rows[0].total),
      pagina: parseInt(pagina),
      limite: parseInt(limite),
      contactos: datos.rows,
    });
  } catch (error) { next(error); }
};

const obtenerContactoPorId = async (req, res, next) => {
  try {
    const resultado = await consultar(
      `SELECT c.*, t.nombre AS territorio_nombre
       FROM contactos c LEFT JOIN territorios t ON c.territorio_id = t.id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Contacto no encontrado' });
    }
    res.json({ exito: true, contacto: resultado.rows[0] });
  } catch (error) { next(error); }
};

const crearContacto = async (req, res, next) => {
  try {
    const errores = validationResult(req);
    if (!errores.isEmpty()) return res.status(400).json({ exito: false, errores: errores.array() });

    const { nombres, apellidos, documento, telefono, email, territorio_id, tipo, lider_comunitario, simpatizante, voluntario, notas } = req.body;

    const resultado = await consultar(
      `INSERT INTO contactos (nombres, apellidos, documento, telefono, email, territorio_id, tipo, lider_comunitario, simpatizante, voluntario, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [nombres, apellidos, documento, telefono, email, territorio_id || null, tipo || 'ciudadano', lider_comunitario || false, simpatizante || false, voluntario || false, notas]
    );

    res.status(201).json({ exito: true, mensaje: 'Contacto creado', contacto: resultado.rows[0] });
  } catch (error) { next(error); }
};

const actualizarContacto = async (req, res, next) => {
  try {
    const { nombres, apellidos, documento, telefono, email, territorio_id, tipo, lider_comunitario, simpatizante, voluntario, notas } = req.body;

    const resultado = await consultar(
      `UPDATE contactos SET
         nombres = COALESCE($1, nombres), apellidos = COALESCE($2, apellidos),
         documento = COALESCE($3, documento), telefono = COALESCE($4, telefono),
         email = COALESCE($5, email), territorio_id = COALESCE($6, territorio_id),
         tipo = COALESCE($7, tipo), lider_comunitario = COALESCE($8, lider_comunitario),
         simpatizante = COALESCE($9, simpatizante), voluntario = COALESCE($10, voluntario),
         notas = COALESCE($11, notas), updated_at = NOW()
       WHERE id = $12 RETURNING *`,
      [nombres, apellidos, documento, telefono, email, territorio_id, tipo, lider_comunitario, simpatizante, voluntario, notas, req.params.id]
    );

    if (resultado.rows.length === 0) return res.status(404).json({ exito: false, mensaje: 'Contacto no encontrado' });
    res.json({ exito: true, contacto: resultado.rows[0] });
  } catch (error) { next(error); }
};

const eliminarContacto = async (req, res, next) => {
  try {
    const resultado = await consultar('DELETE FROM contactos WHERE id = $1 RETURNING id', [req.params.id]);
    if (resultado.rows.length === 0) return res.status(404).json({ exito: false, mensaje: 'Contacto no encontrado' });
    res.json({ exito: true, mensaje: 'Contacto eliminado' });
  } catch (error) { next(error); }
};

// =====================================================
// CAMPAÑAS
// =====================================================

const listarCampanas = async (req, res, next) => {
  try {
    const resultado = await consultar(`
      SELECT c.*,
             (SELECT COUNT(*) FROM equipos WHERE campana_id = c.id) AS equipos_count,
             (SELECT COUNT(*) FROM tareas WHERE campana_id = c.id) AS tareas_count
      FROM campanas c ORDER BY c.created_at DESC
    `);
    res.json({ exito: true, campanas: resultado.rows });
  } catch (error) { next(error); }
};

const crearCampana = async (req, res, next) => {
  try {
    const { nombre, descripcion, fecha_inicio, fecha_fin, presupuesto } = req.body;
    const resultado = await consultar(
      `INSERT INTO campanas (nombre, descripcion, fecha_inicio, fecha_fin, presupuesto)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [nombre, descripcion, fecha_inicio, fecha_fin, presupuesto]
    );
    res.status(201).json({ exito: true, campana: resultado.rows[0] });
  } catch (error) { next(error); }
};

// =====================================================
// TAREAS
// =====================================================

const listarTareas = async (req, res, next) => {
  try {
    const { estado, asignado_a, campana_id, prioridad } = req.query;
    let condiciones = [];
    let parametros = [];
    let cnt = 1;

    if (estado) { condiciones.push(`t.estado = $${cnt++}`); parametros.push(estado); }
    if (asignado_a) { condiciones.push(`t.asignado_a = $${cnt++}`); parametros.push(asignado_a); }
    if (campana_id) { condiciones.push(`t.campana_id = $${cnt++}`); parametros.push(campana_id); }
    if (prioridad) { condiciones.push(`t.prioridad = $${cnt++}`); parametros.push(prioridad); }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const resultado = await consultar(
      `SELECT t.*, u.nombre || ' ' || u.apellido AS asignado_nombre, c.nombre AS campana_nombre
       FROM tareas t
       LEFT JOIN usuarios u ON t.asignado_a = u.id
       LEFT JOIN campanas c ON t.campana_id = c.id
       ${where} ORDER BY
         CASE t.prioridad WHEN 'critica' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END,
         t.fecha_limite ASC NULLS LAST`,
      parametros
    );
    res.json({ exito: true, tareas: resultado.rows });
  } catch (error) { next(error); }
};

const crearTarea = async (req, res, next) => {
  try {
    const { titulo, descripcion, estado, prioridad, asignado_a, campana_id, territorio_id, fecha_limite } = req.body;
    const resultado = await consultar(
      `INSERT INTO tareas (titulo, descripcion, estado, prioridad, asignado_a, campana_id, territorio_id, fecha_limite)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [titulo, descripcion, estado || 'pendiente', prioridad || 'media', asignado_a || null, campana_id || null, territorio_id || null, fecha_limite || null]
    );
    res.status(201).json({ exito: true, tarea: resultado.rows[0] });
  } catch (error) { next(error); }
};

const actualizarTarea = async (req, res, next) => {
  try {
    const { titulo, descripcion, estado, prioridad, asignado_a, fecha_limite } = req.body;
    const completada_en = estado === 'completada' ? 'NOW()' : 'completada_en';

    const resultado = await consultar(
      `UPDATE tareas SET
         titulo = COALESCE($1, titulo), descripcion = COALESCE($2, descripcion),
         estado = COALESCE($3, estado), prioridad = COALESCE($4, prioridad),
         asignado_a = COALESCE($5, asignado_a), fecha_limite = COALESCE($6, fecha_limite),
         completada_en = CASE WHEN $3 = 'completada' AND completada_en IS NULL THEN NOW() ELSE completada_en END,
         updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [titulo, descripcion, estado, prioridad, asignado_a, fecha_limite, req.params.id]
    );

    if (resultado.rows.length === 0) return res.status(404).json({ exito: false, mensaje: 'Tarea no encontrada' });
    res.json({ exito: true, tarea: resultado.rows[0] });
  } catch (error) { next(error); }
};

module.exports = {
  listarContactos, obtenerContactoPorId, crearContacto, actualizarContacto, eliminarContacto,
  listarCampanas, crearCampana,
  listarTareas, crearTarea, actualizarTarea,
};
