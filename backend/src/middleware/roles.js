// Jerarquía de roles: mayor nivel = más permisos
const JERARQUIA_ROLES = {
  superadmin: 6,
  admin:      5,
  estratega:  4,
  analista:   3,
  coordinador: 2,
  observador: 1,
};

/**
 * Middleware que verifica si el usuario tiene al menos uno de los roles indicados.
 * @param {...string} rolesPermitidos - Roles con acceso al endpoint
 */
const requiereRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        exito: false,
        mensaje: 'No autenticado',
      });
    }

    const rolUsuario = req.usuario.rol;
    const tienePermiso = rolesPermitidos.some(
      (rolPermitido) =>
        JERARQUIA_ROLES[rolUsuario] >= JERARQUIA_ROLES[rolPermitido]
    );

    if (!tienePermiso) {
      return res.status(403).json({
        exito: false,
        mensaje: 'No tienes permisos para realizar esta acción',
        rolRequerido: rolesPermitidos,
        rolActual: rolUsuario,
      });
    }

    next();
  };
};

/**
 * Middleware que permite solo a superadmin y admin.
 */
const soloAdmin = requiereRol('admin');

/**
 * Middleware que permite a analistas y superiores.
 */
const soloAnalistas = requiereRol('analista');

module.exports = { requiereRol, soloAdmin, soloAnalistas, JERARQUIA_ROLES };
