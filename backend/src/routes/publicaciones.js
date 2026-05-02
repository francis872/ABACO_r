/**
 * routes/publicaciones.js
 * Rutas del módulo social: publicaciones, likes, comentarios, notificaciones.
 */

const express = require('express');
const { autenticar } = require('../middleware/auth');
const {
  subirAdjuntos,
  listarPublicaciones,
  crearPublicacion,
  eliminarPublicacion,
  toggleLike,
  listarComentarios,
  agregarComentario,
  eliminarComentario,
  listarNotificaciones,
  marcarNotificacionesLeidas,
} = require('../controllers/publicacionesController');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(autenticar);

// ── Notificaciones (antes de /:id para no colisionar) ──────────────
router.get('/notificaciones',          listarNotificaciones);
router.patch('/notificaciones/leer',   marcarNotificacionesLeidas);

// ── Feed ───────────────────────────────────────────────────────────
router.get('/',    listarPublicaciones);
router.post('/',   subirAdjuntos, crearPublicacion);

// ── Publicación individual ─────────────────────────────────────────
router.delete('/:id',                       eliminarPublicacion);
router.post('/:id/like',                    toggleLike);
router.get('/:id/comentarios',              listarComentarios);
router.post('/:id/comentarios',             agregarComentario);
router.delete('/:pubId/comentarios/:comentId', eliminarComentario);

module.exports = router;
