const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { consultar } = require('../config/database');

/**
 * GET /api/usuarios
 * Lista todos los usuarios (solo admin).
 */
const listar = async (req, res, next) => {
  try {
    const { activo, rol, buscar } = req.query;
    let condiciones = [];
    let parametros = [];
    let contador = 1;

    if (activo !== undefined) {
      condiciones.push(`activo = $${contador++}`);
      parametros.push(activo === 'true');
    }
    if (rol) {
      condiciones.push(`rol = $${contador++}`);
      parametros.push(rol);
    }
    if (buscar) {
      condiciones.push(`(nombre ILIKE $${contador} OR apellido ILIKE $${contador} OR email ILIKE $${contador})`);
      parametros.push(`%${buscar}%`);
      contador++;
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const resultado = await consultar(
      `SELECT id, nombre, apellido, email, rol, activo, ultimo_acceso, created_at
       FROM usuarios ${where} ORDER BY created_at DESC`,
      parametros
    );

    res.json({ exito: true, total: resultado.rowCount, usuarios: resultado.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/usuarios/:id
 * Obtiene un usuario por ID.
 */
const obtenerPorId = async (req, res, next) => {
  try {
    const resultado = await consultar(
      `SELECT id, nombre, apellido, email, rol, activo, ultimo_acceso, created_at
       FROM usuarios WHERE id = $1`,
      [req.params.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
    }

    res.json({ exito: true, usuario: resultado.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/usuarios
 * Crea un nuevo usuario (solo admin).
 */
const crear = async (req, res, next) => {
  try {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ exito: false, errores: errores.array() });
    }

    const { nombre, apellido, email, password, rol } = req.body;

    // Verificar email duplicado
    const existe = await consultar('SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ exito: false, mensaje: 'El email ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const resultado = await consultar(
      `INSERT INTO usuarios (nombre, apellido, email, password_hash, rol)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, apellido, email, rol, activo, created_at`,
      [nombre.trim(), apellido.trim(), email.toLowerCase().trim(), passwordHash, rol || 'observador']
    );

    res.status(201).json({
      exito: true,
      mensaje: 'Usuario creado correctamente',
      usuario: resultado.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/usuarios/:id
 * Actualiza datos de un usuario.
 */
const actualizar = async (req, res, next) => {
  try {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ exito: false, errores: errores.array() });
    }

    const { nombre, apellido, rol, activo } = req.body;
    const { id } = req.params;

    const resultado = await consultar(
      `UPDATE usuarios
       SET nombre = COALESCE($1, nombre),
           apellido = COALESCE($2, apellido),
           rol = COALESCE($3, rol),
           activo = COALESCE($4, activo),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, nombre, apellido, email, rol, activo, updated_at`,
      [nombre, apellido, rol, activo, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
    }

    res.json({ exito: true, mensaje: 'Usuario actualizado', usuario: resultado.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/usuarios/:id
 * Desactiva un usuario (borrado lógico, solo superadmin).
 */
const desactivar = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.usuario.id) {
      return res.status(400).json({ exito: false, mensaje: 'No puedes desactivar tu propia cuenta' });
    }

    const resultado = await consultar(
      'UPDATE usuarios SET activo = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id',
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
    }

    res.json({ exito: true, mensaje: 'Usuario desactivado correctamente' });
  } catch (error) {
    next(error);
  }
};

module.exports = { listar, obtenerPorId, crear, actualizar, desactivar };
