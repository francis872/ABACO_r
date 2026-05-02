/**
 * socialSocket.js
 * Namespace /social — tiempo real para publicaciones, likes, comentarios y notificaciones.
 */

const jwt = require('jsonwebtoken');

// Mapa: usuarioId -> Set de socketIds (un usuario puede tener varias pestañas)
const usuariosConectados = new Map();

function iniciarSocketSocial(io) {
  const social = io.of('/social');

  // ── Autenticación ──────────────────────────────────────────────
  social.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Token requerido'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.usuario = payload;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  // ── Conexión ───────────────────────────────────────────────────
  social.on('connection', (socket) => {
    const userId = socket.usuario.id;

    // Unirse a sala privada para notificaciones dirigidas
    socket.join(`user:${userId}`);

    // Registrar socket en el mapa
    if (!usuariosConectados.has(userId)) {
      usuariosConectados.set(userId, new Set());
    }
    usuariosConectados.get(userId).add(socket.id);

    // Sala de feed global
    socket.join('feed:global');

    // ── Eventos ─────────────────────────────────────────────────

    // El cliente indica que quiere el feed de un territorio
    socket.on('suscribir_territorio', (territorioId) => {
      if (territorioId) socket.join(`feed:territorio:${territorioId}`);
    });

    socket.on('desuscribir_territorio', (territorioId) => {
      if (territorioId) socket.leave(`feed:territorio:${territorioId}`);
    });

    // ── Desconexión ──────────────────────────────────────────────
    socket.on('disconnect', () => {
      const sockets = usuariosConectados.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) usuariosConectados.delete(userId);
      }
    });
  });

  return social;
}

/** Cuántos usuarios distintos están conectados al namespace social. */
function usuariosActivos() {
  return usuariosConectados.size;
}

module.exports = { iniciarSocketSocial, usuariosActivos };
