/**
 * Manejador centralizado de errores para Express.
 * Captura errores no manejados y retorna respuestas JSON consistentes.
 */
const manejarErrores = (err, req, res, next) => {
  console.error(`❌ Error [${req.method} ${req.path}]:`, err.message);

  // Error de validación (express-validator)
  if (err.type === 'validation') {
    return res.status(400).json({
      exito: false,
      mensaje: 'Datos de entrada inválidos',
      errores: err.errores,
    });
  }

  // Error de duplicado en PostgreSQL (unique constraint)
  if (err.code === '23505') {
    return res.status(409).json({
      exito: false,
      mensaje: 'El registro ya existe (valor duplicado)',
    });
  }

  // Error de clave foránea en PostgreSQL
  if (err.code === '23503') {
    return res.status(400).json({
      exito: false,
      mensaje: 'Referencia inválida: el recurso relacionado no existe',
    });
  }

  // Error de formato UUID inválido
  if (err.code === '22P02') {
    return res.status(400).json({
      exito: false,
      mensaje: 'Identificador inválido',
    });
  }

  // Error genérico
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    exito: false,
    mensaje: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message || 'Error desconocido',
  });
};

/**
 * Middleware para rutas no encontradas (404).
 */
const noEncontrado = (req, res) => {
  res.status(404).json({
    exito: false,
    mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
};

module.exports = { manejarErrores, noEncontrado };
