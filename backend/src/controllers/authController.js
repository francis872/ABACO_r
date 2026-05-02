const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { consultar } = require('../config/database');

/**
 * Genera un JWT de acceso para el usuario dado.
 */
const generarToken = (usuario) => {
  return jwt.sign(
    { id: usuario.id, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
};

/**
 * POST /api/auth/login
 * Inicia sesión con email y contraseña.
 */
const login = async (req, res, next) => {
  try {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ exito: false, errores: errores.array() });
    }

    const { email, password } = req.body;

    // Buscar usuario por email
    const resultado = await consultar(
      'SELECT id, nombre, apellido, email, password_hash, rol, activo FROM usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({
        exito: false,
        mensaje: 'Credenciales incorrectas',
      });
    }

    const usuario = resultado.rows[0];

    if (!usuario.activo) {
      return res.status(403).json({
        exito: false,
        mensaje: 'Cuenta desactivada. Contacta al administrador.',
      });
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({
        exito: false,
        mensaje: 'Credenciales incorrectas',
      });
    }

    // Actualizar último acceso
    await consultar(
      'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1',
      [usuario.id]
    );

    const token = generarToken(usuario);

    res.json({
      exito: true,
      mensaje: 'Sesión iniciada correctamente',
      token,
      usuario: {
        id:       usuario.id,
        nombre:   usuario.nombre,
        apellido: usuario.apellido,
        email:    usuario.email,
        rol:      usuario.rol,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/perfil
 * Retorna los datos del usuario autenticado.
 */
const obtenerPerfil = async (req, res, next) => {
  try {
    const resultado = await consultar(
      `SELECT id, nombre, apellido, email, rol, ultimo_acceso, created_at
       FROM usuarios WHERE id = $1`,
      [req.usuario.id]
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
 * PUT /api/auth/cambiar-password
 * Cambia la contraseña del usuario autenticado.
 */
const cambiarPassword = async (req, res, next) => {
  try {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ exito: false, errores: errores.array() });
    }

    const { passwordActual, passwordNueva } = req.body;

    const resultado = await consultar(
      'SELECT password_hash FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );

    const valida = await bcrypt.compare(passwordActual, resultado.rows[0].password_hash);
    if (!valida) {
      return res.status(401).json({
        exito: false,
        mensaje: 'La contraseña actual es incorrecta',
      });
    }

    const nuevoHash = await bcrypt.hash(passwordNueva, 12);
    await consultar(
      'UPDATE usuarios SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [nuevoHash, req.usuario.id]
    );

    res.json({ exito: true, mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/registro
 * Crea una nueva cuenta pública con rol 'observador'.
 */
const registro = async (req, res, next) => {
  try {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ exito: false, errores: errores.array() });
    }

    const { nombre, apellido, email, password } = req.body;

    // Verificar email duplicado
    const existe = await consultar(
      'SELECT id FROM usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (existe.rows.length > 0) {
      return res.status(409).json({
        exito: false,
        mensaje: 'El correo electrónico ya está registrado',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const resultado = await consultar(
      `INSERT INTO usuarios (nombre, apellido, email, password_hash, rol)
       VALUES ($1, $2, $3, $4, 'observador')
       RETURNING id, nombre, apellido, email, rol`,
      [nombre.trim(), apellido.trim(), email.toLowerCase().trim(), passwordHash]
    );

    const usuario = resultado.rows[0];
    const token = generarToken(usuario);

    res.status(201).json({
      exito: true,
      mensaje: 'Cuenta creada correctamente',
      token,
      usuario,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, registro, obtenerPerfil, cambiarPassword };
