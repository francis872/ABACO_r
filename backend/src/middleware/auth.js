const jwt = require('jsonwebtoken');
const { consultar } = require('../config/database');

/**
 * Middleware de autenticación JWT.
 * Verifica el token en el header Authorization: Bearer <token>
 */
const autenticar = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        exito: false,
        mensaje: 'Token de autenticación requerido',
      });
    }

    const token = authHeader.split(' ')[1];

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        exito: false,
        mensaje: 'Token inválido o expirado',
      });
    }

    // Verificar que el usuario sigue activo en la base de datos
    const resultado = await consultar(
      'SELECT id, nombre, apellido, email, rol, activo FROM usuarios WHERE id = $1',
      [payload.id]
    );

    if (resultado.rows.length === 0 || !resultado.rows[0].activo) {
      return res.status(401).json({
        exito: false,
        mensaje: 'Usuario no encontrado o desactivado',
      });
    }

    req.usuario = resultado.rows[0];
    next();
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor',
    });
  }
};

module.exports = { autenticar };
