/**
 * mapaSocket.js
 * Servidor WebSocket para el mapa en tiempo real de ÁBACO.
 * Gestiona rooms por territorio, difusión de eventos y actualizaciones live.
 */

const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Usuarios conectados: socketId -> { usuarioId, nombre, territorioActual }
const usuariosConectados = new Map();

function iniciarSocketMapa(io) {
  // Namespace dedicado al mapa
  const mapa = io.of('/mapa');

  // Middleware de autenticación por token
  mapa.use((socket, next) => {
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

  mapa.on('connection', async (socket) => {
    const { id: usuarioId, nombre, rol } = socket.usuario;
    console.log(`🗺️  [Mapa] Conectado: ${nombre} (${socket.id})`);

    usuariosConectados.set(socket.id, { usuarioId, nombre, rol, territorioActual: null });

    // Enviar conteo de usuarios online al conectar
    socket.emit('usuarios_online', { total: usuariosConectados.size });
    mapa.emit('usuarios_online', { total: usuariosConectados.size });

    // ─────────────────────────────────────────────
    // UNIRSE A ROOM DE UN TERRITORIO
    // ─────────────────────────────────────────────
    socket.on('unirse_territorio', async ({ territorioId }) => {
      // Salir del room anterior si existe
      const info = usuariosConectados.get(socket.id);
      if (info?.territorioActual) {
        socket.leave(`territorio:${info.territorioActual}`);
      }

      socket.join(`territorio:${territorioId}`);
      usuariosConectados.get(socket.id).territorioActual = territorioId;

      // Cargar últimos 20 eventos de ese territorio
      try {
        const { rows } = await pool.query(
          `SELECT e.*, u.nombre AS autor_nombre
           FROM eventos_mapa e
           LEFT JOIN usuarios u ON e.usuario_id = u.id
           WHERE e.territorio_id = $1
           ORDER BY e.created_at DESC
           LIMIT 20`,
          [territorioId]
        );
        socket.emit('historial_eventos', { territorioId, eventos: rows.reverse() });
      } catch (err) {
        console.error('Error cargando historial:', err.message);
      }

      // Notificar al room que un usuario entró
      socket.to(`territorio:${territorioId}`).emit('usuario_entro', {
        nombre,
        territorioId,
        timestamp: new Date().toISOString(),
      });
    });

    // ─────────────────────────────────────────────
    // PUBLICAR EVENTO EN EL MAPA
    // ─────────────────────────────────────────────
    socket.on('publicar_evento', async ({ territorioId, tipo, titulo, descripcion, latitud, longitud, datos_extra }) => {
      try {
        const geom = (latitud != null && longitud != null)
          ? `ST_SetSRID(ST_MakePoint(${parseFloat(longitud)}, ${parseFloat(latitud)}), 4326)`
          : 'NULL';

        const { rows } = await pool.query(
          `INSERT INTO eventos_mapa
             (territorio_id, usuario_id, tipo, titulo, descripcion, latitud, longitud, geom, datos_extra)
           VALUES
             ($1, $2, $3, $4, $5, $6, $7, ${geom}, $8)
           RETURNING *`,
          [
            territorioId,
            usuarioId,
            tipo || 'general',
            titulo,
            descripcion || null,
            latitud || null,
            longitud || null,
            datos_extra ? JSON.stringify(datos_extra) : null,
          ]
        );

        const evento = { ...rows[0], autor_nombre: nombre };

        // Difundir a todos en el room del territorio
        mapa.to(`territorio:${territorioId}`).emit('nuevo_evento', evento);

        // Difundir a todos (para el mapa global)
        mapa.emit('evento_global', evento);
      } catch (err) {
        socket.emit('error_evento', { mensaje: err.message });
      }
    });

    // ─────────────────────────────────────────────
    // ACTUALIZACIÓN DE POSICIÓN (cursor del analista)
    // ─────────────────────────────────────────────
    socket.on('actualizar_posicion', ({ latitud, longitud, territorioId }) => {
      const info = usuariosConectados.get(socket.id);
      socket.to(`territorio:${territorioId}`).emit('posicion_usuario', {
        socketId: socket.id,
        nombre: info?.nombre,
        latitud,
        longitud,
      });
    });

    // ─────────────────────────────────────────────
    // SOLICITAR ESTADÍSTICAS ESPACIALES EN VIVO
    // ─────────────────────────────────────────────
    socket.on('solicitar_stats', async ({ territorioId }) => {
      try {
        const { rows } = await pool.query(
          `SELECT
             tipo,
             COUNT(*) AS total,
             MAX(created_at) AS ultimo
           FROM eventos_mapa
           WHERE territorio_id = $1
           GROUP BY tipo`,
          [territorioId]
        );
        socket.emit('stats_territorio', { territorioId, stats: rows });
      } catch (err) {
        socket.emit('error_evento', { mensaje: err.message });
      }
    });

    // ─────────────────────────────────────────────
    // DESCONEXIÓN
    // ─────────────────────────────────────────────
    socket.on('disconnect', () => {
      const info = usuariosConectados.get(socket.id);
      if (info?.territorioActual) {
        socket.to(`territorio:${info.territorioActual}`).emit('usuario_salio', {
          nombre: info.nombre,
          timestamp: new Date().toISOString(),
        });
      }
      usuariosConectados.delete(socket.id);
      mapa.emit('usuarios_online', { total: usuariosConectados.size });
      console.log(`🗺️  [Mapa] Desconectado: ${nombre} (${socket.id})`);
    });
  });

  return mapa;
}

// Exportar para que el controlador pueda emitir eventos desde HTTP
let _mapaNamespace = null;
function getMapaNs() { return _mapaNamespace; }
function setMapaNs(ns) { _mapaNamespace = ns; }

module.exports = { iniciarSocketMapa, getMapaNs, setMapaNs };
