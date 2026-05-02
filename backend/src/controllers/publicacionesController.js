/**
 * publicacionesController.js
 * CRUD de publicaciones, likes, comentarios y notificaciones.
 */

const { pool } = require('../config/database');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// ─── Configuración de Multer ──────────────────────────────────────────────────

const TIPOS_PERMITIDOS = {
  'image/jpeg':       { ext: '.jpg',  tipo: 'imagen' },
  'image/png':        { ext: '.png',  tipo: 'imagen' },
  'image/webp':       { ext: '.webp', tipo: 'imagen' },
  'application/pdf':  { ext: '.pdf',  tipo: 'pdf'    },
};

const MAX_BYTES  = 10 * 1024 * 1024; // 10 MB por archivo
const MAX_FILES  = 4;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/publicaciones');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = TIPOS_PERMITIDOS[file.mimetype]?.ext || '.bin';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (TIPOS_PERMITIDOS[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo JPEG, PNG, WebP y PDF.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_BYTES, files: MAX_FILES },
});

// Exportar middleware de upload para usar en la ruta
const subirAdjuntos = upload.array('adjuntos', MAX_FILES);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Emite evento social via socket.io si el namespace está disponible. */
function emitirSocial(req, evento, payload) {
  try {
    const io = req.app.get('io');
    if (io) io.of('/social').emit(evento, payload);
  } catch (_) {}
}

/** Emite notificación privada al usuario destino. */
function emitirNotificacion(req, usuarioId, notif) {
  try {
    const io = req.app.get('io');
    if (io) io.of('/social').to(`user:${usuarioId}`).emit('nueva_notificacion', notif);
  } catch (_) {}
}

/** Busca y devuelve una publicación completa por id (con usuario, adjuntos, conteos). */
async function publicacionCompleta(id, solicitanteId) {
  const { rows } = await pool.query(`
    SELECT
      p.id,
      p.contenido,
      p.territorio_id,
      p.created_at,
      u.id           AS usuario_id,
      u.nombre       AS usuario_nombre,
      u.apellido     AS usuario_apellido,
      u.rol          AS usuario_rol,
      t.nombre       AS territorio_nombre,
      (SELECT COUNT(*) FROM publicacion_likes l WHERE l.publicacion_id = p.id) AS likes,
      (SELECT COUNT(*) FROM comentarios       c WHERE c.publicacion_id = p.id) AS comentarios,
      EXISTS(
        SELECT 1 FROM publicacion_likes
        WHERE publicacion_id = p.id AND usuario_id = $2
      ) AS yo_di_like
    FROM publicaciones p
    JOIN usuarios u ON u.id = p.usuario_id
    LEFT JOIN territorios t ON t.id = p.territorio_id
    WHERE p.id = $1
  `, [id, solicitanteId]);

  if (!rows[0]) return null;

  const pub = rows[0];

  const { rows: adjuntos } = await pool.query(`
    SELECT id, tipo, url, nombre_original, tamano_bytes
    FROM publicacion_adjuntos
    WHERE publicacion_id = $1
    ORDER BY created_at
  `, [id]);

  return { ...pub, adjuntos };
}

// ─── Controladores ───────────────────────────────────────────────────────────

/**
 * GET /api/publicaciones?pagina=1&limite=20&territorio_id=xxx
 * Feed global (o filtrado por territorio).
 */
async function listarPublicaciones(req, res, next) {
  try {
    const pagina  = Math.max(1, parseInt(req.query.pagina  || '1'));
    const limite  = Math.min(50, parseInt(req.query.limite || '20'));
    const offset  = (pagina - 1) * limite;
    const terr    = req.query.territorio_id || null;
    const solicitanteId = req.usuario.id;

    const filtroTerritorio = terr
      ? 'AND p.territorio_id = $3'
      : '';

    const params = terr
      ? [solicitanteId, limite, terr, offset]
      : [solicitanteId, limite, offset];

    // Offset param index shifts when territorio_id is present
    const offsetParam = terr ? '$4' : '$3';

    const { rows } = await pool.query(`
      SELECT
        p.id,
        p.contenido,
        p.territorio_id,
        p.created_at,
        u.id           AS usuario_id,
        u.nombre       AS usuario_nombre,
        u.apellido     AS usuario_apellido,
        u.rol          AS usuario_rol,
        t.nombre       AS territorio_nombre,
        (SELECT COUNT(*) FROM publicacion_likes l WHERE l.publicacion_id = p.id)::int AS likes,
        (SELECT COUNT(*) FROM comentarios       c WHERE c.publicacion_id = p.id)::int AS comentarios,
        EXISTS(
          SELECT 1 FROM publicacion_likes
          WHERE publicacion_id = p.id AND usuario_id = $1
        ) AS yo_di_like
      FROM publicaciones p
      JOIN usuarios u ON u.id = p.usuario_id
      LEFT JOIN territorios t ON t.id = p.territorio_id
      WHERE 1=1 ${filtroTerritorio}
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET ${offsetParam}
    `, params);

    // Adjuntos por publicación (batch)
    const ids = rows.map(r => r.id);
    let adjuntosPorPub = {};
    if (ids.length > 0) {
      const { rows: adj } = await pool.query(`
        SELECT publicacion_id, id, tipo, url, nombre_original, tamano_bytes
        FROM publicacion_adjuntos
        WHERE publicacion_id = ANY($1)
        ORDER BY created_at
      `, [ids]);
      adj.forEach(a => {
        if (!adjuntosPorPub[a.publicacion_id]) adjuntosPorPub[a.publicacion_id] = [];
        adjuntosPorPub[a.publicacion_id].push(a);
      });
    }

    const publicaciones = rows.map(p => ({
      ...p,
      adjuntos: adjuntosPorPub[p.id] || [],
    }));

    res.json({ exito: true, publicaciones, pagina, limite });
  } catch (err) { next(err); }
}

/**
 * POST /api/publicaciones
 * Crea una publicación con adjuntos opcionales.
 */
async function crearPublicacion(req, res, next) {
  const client = await pool.connect();
  try {
    const { contenido, territorio_id } = req.body;
    if (!contenido || contenido.trim().length === 0) {
      return res.status(400).json({ exito: false, mensaje: 'El contenido es requerido.' });
    }

    await client.query('BEGIN');

    const { rows } = await client.query(`
      INSERT INTO publicaciones (id, usuario_id, contenido, territorio_id)
      VALUES (uuid_generate_v4(), $1, $2, $3)
      RETURNING id
    `, [req.usuario.id, contenido.trim(), territorio_id || null]);

    const pubId = rows[0].id;

    // Guardar adjuntos si los hay
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const tipoInfo = TIPOS_PERMITIDOS[file.mimetype];
        const urlRelativa = `/uploads/publicaciones/${file.filename}`;
        await client.query(`
          INSERT INTO publicacion_adjuntos (id, publicacion_id, tipo, url, nombre_original, tamano_bytes)
          VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)
        `, [pubId, tipoInfo.tipo, urlRelativa, file.originalname, file.size]);
      }
    }

    await client.query('COMMIT');

    const pub = await publicacionCompleta(pubId, req.usuario.id);
    emitirSocial(req, 'nueva_publicacion', pub);

    res.status(201).json({ exito: true, publicacion: pub });
  } catch (err) {
    await client.query('ROLLBACK');
    // Eliminar archivos subidos si hubo error
    if (req.files) req.files.forEach(f => fs.unlink(f.path, () => {}));
    next(err);
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/publicaciones/:id
 * Solo el autor o admin/superadmin puede eliminar.
 */
async function eliminarPublicacion(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT usuario_id FROM publicaciones WHERE id = $1', [id]
    );
    if (!rows[0]) return res.status(404).json({ exito: false, mensaje: 'Publicación no encontrada.' });

    const esAutor = rows[0].usuario_id === req.usuario.id;
    const esAdmin = ['admin', 'superadmin'].includes(req.usuario.rol);
    if (!esAutor && !esAdmin) {
      return res.status(403).json({ exito: false, mensaje: 'Sin permiso para eliminar esta publicación.' });
    }

    // Obtener adjuntos para borrar archivos
    const { rows: adj } = await pool.query(
      'SELECT url FROM publicacion_adjuntos WHERE publicacion_id = $1', [id]
    );

    await pool.query('DELETE FROM publicaciones WHERE id = $1', [id]);

    // Borrar archivos físicos
    adj.forEach(a => {
      const filePath = path.join(__dirname, '../../', a.url);
      fs.unlink(filePath, () => {});
    });

    emitirSocial(req, 'publicacion_eliminada', { id });

    res.json({ exito: true, mensaje: 'Publicación eliminada.' });
  } catch (err) { next(err); }
}

/**
 * POST /api/publicaciones/:id/like
 * Alterna like/unlike. Crea notificación si es nuevo like.
 */
async function toggleLike(req, res, next) {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario.id;

    // Verificar que existe la publicación
    const { rows: pub } = await pool.query(
      'SELECT id, usuario_id FROM publicaciones WHERE id = $1', [id]
    );
    if (!pub[0]) return res.status(404).json({ exito: false, mensaje: 'Publicación no encontrada.' });

    // Ver si ya dio like
    const { rows: existing } = await pool.query(
      'SELECT id FROM publicacion_likes WHERE publicacion_id = $1 AND usuario_id = $2',
      [id, usuarioId]
    );

    let dioLike;
    if (existing[0]) {
      // Quitar like
      await pool.query(
        'DELETE FROM publicacion_likes WHERE publicacion_id = $1 AND usuario_id = $2',
        [id, usuarioId]
      );
      dioLike = false;
    } else {
      // Dar like
      await pool.query(
        'INSERT INTO publicacion_likes (id, publicacion_id, usuario_id) VALUES (uuid_generate_v4(), $1, $2)',
        [id, usuarioId]
      );
      dioLike = true;

      // Notificar al autor (excepto si es el mismo usuario)
      if (pub[0].usuario_id !== usuarioId) {
        const { rows: notif } = await pool.query(`
          INSERT INTO notificaciones (id, usuario_id, actor_id, tipo, publicacion_id)
          VALUES (uuid_generate_v4(), $1, $2, 'like', $3)
          RETURNING id, tipo, publicacion_id, created_at
        `, [pub[0].usuario_id, usuarioId, id]);

        const { rows: actor } = await pool.query(
          'SELECT nombre, apellido FROM usuarios WHERE id = $1', [usuarioId]
        );

        emitirNotificacion(req, pub[0].usuario_id, {
          ...notif[0],
          actor_nombre: `${actor[0].nombre} ${actor[0].apellido}`,
        });
      }
    }

    const { rows: conteo } = await pool.query(
      'SELECT COUNT(*)::int AS total FROM publicacion_likes WHERE publicacion_id = $1', [id]
    );

    const payload = { publicacion_id: id, likes: conteo[0].total, yo_di_like: dioLike };
    emitirSocial(req, 'like_actualizado', payload);

    res.json({ exito: true, ...payload });
  } catch (err) { next(err); }
}

/**
 * GET /api/publicaciones/:id/comentarios
 * Lista comentarios de una publicación.
 */
async function listarComentarios(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`
      SELECT
        c.id,
        c.contenido,
        c.created_at,
        u.id       AS usuario_id,
        u.nombre   AS usuario_nombre,
        u.apellido AS usuario_apellido,
        u.rol      AS usuario_rol
      FROM comentarios c
      JOIN usuarios u ON u.id = c.usuario_id
      WHERE c.publicacion_id = $1
      ORDER BY c.created_at ASC
    `, [id]);

    res.json({ exito: true, comentarios: rows });
  } catch (err) { next(err); }
}

/**
 * POST /api/publicaciones/:id/comentarios
 * Agrega un comentario. Notifica al autor.
 */
async function agregarComentario(req, res, next) {
  try {
    const { id } = req.params;
    const { contenido } = req.body;
    const usuarioId = req.usuario.id;

    if (!contenido || contenido.trim().length === 0) {
      return res.status(400).json({ exito: false, mensaje: 'El comentario no puede estar vacío.' });
    }

    const { rows: pub } = await pool.query(
      'SELECT id, usuario_id FROM publicaciones WHERE id = $1', [id]
    );
    if (!pub[0]) return res.status(404).json({ exito: false, mensaje: 'Publicación no encontrada.' });

    const { rows } = await pool.query(`
      INSERT INTO comentarios (id, publicacion_id, usuario_id, contenido)
      VALUES (uuid_generate_v4(), $1, $2, $3)
      RETURNING id, contenido, created_at
    `, [id, usuarioId, contenido.trim()]);

    const { rows: actor } = await pool.query(
      'SELECT nombre, apellido, rol FROM usuarios WHERE id = $1', [usuarioId]
    );

    const comentario = {
      ...rows[0],
      publicacion_id: id,
      usuario_id:       usuarioId,
      usuario_nombre:   actor[0].nombre,
      usuario_apellido: actor[0].apellido,
      usuario_rol:      actor[0].rol,
    };

    // Notificar al autor de la publicación
    if (pub[0].usuario_id !== usuarioId) {
      const { rows: notif } = await pool.query(`
        INSERT INTO notificaciones (id, usuario_id, actor_id, tipo, publicacion_id)
        VALUES (uuid_generate_v4(), $1, $2, 'comentario', $3)
        RETURNING id, tipo, publicacion_id, created_at
      `, [pub[0].usuario_id, usuarioId, id]);

      emitirNotificacion(req, pub[0].usuario_id, {
        ...notif[0],
        actor_nombre: `${actor[0].nombre} ${actor[0].apellido}`,
      });
    }

    // Emitir nuevo comentario a todos en el feed
    emitirSocial(req, 'nuevo_comentario', comentario);

    res.status(201).json({ exito: true, comentario });
  } catch (err) { next(err); }
}

/**
 * DELETE /api/publicaciones/:pubId/comentarios/:comentId
 * Solo autor del comentario o admin.
 */
async function eliminarComentario(req, res, next) {
  try {
    const { pubId, comentId } = req.params;
    const { rows } = await pool.query(
      'SELECT usuario_id FROM comentarios WHERE id = $1 AND publicacion_id = $2',
      [comentId, pubId]
    );
    if (!rows[0]) return res.status(404).json({ exito: false, mensaje: 'Comentario no encontrado.' });

    const esAutor = rows[0].usuario_id === req.usuario.id;
    const esAdmin = ['admin', 'superadmin'].includes(req.usuario.rol);
    if (!esAutor && !esAdmin) {
      return res.status(403).json({ exito: false, mensaje: 'Sin permiso para eliminar este comentario.' });
    }

    await pool.query('DELETE FROM comentarios WHERE id = $1', [comentId]);
    emitirSocial(req, 'comentario_eliminado', { publicacion_id: pubId, comentario_id: comentId });

    res.json({ exito: true, mensaje: 'Comentario eliminado.' });
  } catch (err) { next(err); }
}

/**
 * GET /api/publicaciones/notificaciones
 * Notificaciones del usuario autenticado.
 */
async function listarNotificaciones(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT
        n.id,
        n.tipo,
        n.leida,
        n.created_at,
        n.publicacion_id,
        u.nombre   AS actor_nombre,
        u.apellido AS actor_apellido
      FROM notificaciones n
      JOIN usuarios u ON u.id = n.actor_id
      WHERE n.usuario_id = $1
      ORDER BY n.created_at DESC
      LIMIT 50
    `, [req.usuario.id]);

    const sinLeer = rows.filter(n => !n.leida).length;
    res.json({ exito: true, notificaciones: rows, sin_leer: sinLeer });
  } catch (err) { next(err); }
}

/**
 * PATCH /api/publicaciones/notificaciones/leer
 * Marca todas las notificaciones como leídas.
 */
async function marcarNotificacionesLeidas(req, res, next) {
  try {
    await pool.query(
      'UPDATE notificaciones SET leida = TRUE WHERE usuario_id = $1 AND leida = FALSE',
      [req.usuario.id]
    );
    res.json({ exito: true });
  } catch (err) { next(err); }
}

module.exports = {
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
};
