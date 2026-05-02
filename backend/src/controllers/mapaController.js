/**
 * mapaController.js
 * Controlador REST con consultas espaciales PostGIS.
 */

const { pool } = require('../config/database');
const { getMapaNs } = require('../sockets/mapaSocket');

// ─────────────────────────────────────────────────────────────────
// GeoJSON de todos los territorios (con geometría PostGIS)
// ─────────────────────────────────────────────────────────────────
async function obtenerGeoJSON(req, res) {
  const { nivel, prioridad_min } = req.query;

  let filtros = [];
  let params = [];
  let i = 1;

  if (nivel) { filtros.push(`nivel = $${i++}`); params.push(nivel); }
  if (prioridad_min) { filtros.push(`prioridad >= $${i++}`); params.push(parseInt(prioridad_min)); }

  const where = filtros.length ? 'WHERE ' + filtros.join(' AND ') : '';

  const { rows } = await pool.query(
    `SELECT
       id, codigo, nombre, nivel, prioridad, poblacion, votantes_censo,
       latitud, longitud,
       ST_AsGeoJSON(geom)::jsonb AS geometry,
       geojson AS polygon_geojson
     FROM territorios
     ${where}
     ORDER BY prioridad DESC, nombre`,
    params
  );

  // Construir FeatureCollection GeoJSON estándar
  const features = rows.map(t => ({
    type: 'Feature',
    properties: {
      id: t.id,
      codigo: t.codigo,
      nombre: t.nombre,
      nivel: t.nivel,
      prioridad: t.prioridad,
      poblacion: t.poblacion,
      votantes_censo: t.votantes_censo,
    },
    geometry: t.geometry || (t.latitud && t.longitud
      ? { type: 'Point', coordinates: [parseFloat(t.longitud), parseFloat(t.latitud)] }
      : null),
  }));

  res.json({
    exito: true,
    geojson: {
      type: 'FeatureCollection',
      features,
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// Territorios dentro de un radio (ST_DWithin)
// ─────────────────────────────────────────────────────────────────
async function territoriosCercanos(req, res) {
  const { lat, lng, radio_km = 50 } = req.query;
  if (!lat || !lng) return res.status(400).json({ exito: false, mensaje: 'lat y lng requeridos' });

  const { rows } = await pool.query(
    `SELECT
       id, nombre, nivel, prioridad,
       ST_Distance(
         geom::geography,
         ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
       ) / 1000 AS distancia_km
     FROM territorios
     WHERE geom IS NOT NULL
       AND ST_DWithin(
         geom::geography,
         ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
         $3 * 1000
       )
     ORDER BY distancia_km`,
    [parseFloat(lat), parseFloat(lng), parseFloat(radio_km)]
  );

  res.json({ exito: true, territorios: rows });
}

// ─────────────────────────────────────────────────────────────────
// Análisis de clúster por bounding box (ST_Within)
// ─────────────────────────────────────────────────────────────────
async function territoriosEnBBox(req, res) {
  const { min_lng, min_lat, max_lng, max_lat } = req.query;
  if (!min_lng || !min_lat || !max_lng || !max_lat) {
    return res.status(400).json({ exito: false, mensaje: 'Parámetros bbox requeridos' });
  }

  const { rows } = await pool.query(
    `SELECT
       id, nombre, nivel, prioridad, latitud, longitud,
       ST_AsGeoJSON(geom)::jsonb AS geometry
     FROM territorios
     WHERE geom IS NOT NULL
       AND ST_Within(
         geom,
         ST_MakeEnvelope($1, $2, $3, $4, 4326)
       )`,
    [parseFloat(min_lng), parseFloat(min_lat), parseFloat(max_lng), parseFloat(max_lat)]
  );

  res.json({ exito: true, territorios: rows });
}

// ─────────────────────────────────────────────────────────────────
// Guardar polígono GeoJSON de un territorio
// ─────────────────────────────────────────────────────────────────
async function actualizarGeometria(req, res) {
  const { id } = req.params;
  const { geojson, latitud, longitud } = req.body;

  let geomExpr = null;
  if (latitud != null && longitud != null) {
    await pool.query(
      `UPDATE territorios
       SET geom = ST_SetSRID(ST_MakePoint($1, $2), 4326),
           latitud = $2, longitud = $1,
           updated_at = NOW()
       WHERE id = $3`,
      [parseFloat(longitud), parseFloat(latitud), id]
    );
  }
  if (geojson) {
    await pool.query(
      `UPDATE territorios
       SET geojson = $1,
           geom = CASE
             WHEN $1::jsonb->>'type' IS NOT NULL
             THEN ST_SetSRID(ST_GeomFromGeoJSON($1::text), 4326)
             ELSE geom
           END,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(geojson), id]
    );
  }

  const { rows } = await pool.query(
    `SELECT id, nombre, latitud, longitud, ST_AsGeoJSON(geom)::jsonb AS geometry
     FROM territorios WHERE id = $1`,
    [id]
  );

  // Emitir actualización en tiempo real a todos los clientes del mapa
  const ns = getMapaNs();
  if (ns) {
    ns.emit('territorio_actualizado', {
      id,
      geometry: rows[0]?.geometry,
      latitud: rows[0]?.latitud,
      longitud: rows[0]?.longitud,
    });
  }

  res.json({ exito: true, territorio: rows[0] });
}

// ─────────────────────────────────────────────────────────────────
// Listar eventos del mapa (REST)
// ─────────────────────────────────────────────────────────────────
async function listarEventosMapa(req, res) {
  const { territorio_id, tipo, limite = 50 } = req.query;

  let filtros = [];
  let params = [];
  let i = 1;

  if (territorio_id) { filtros.push(`e.territorio_id = $${i++}`); params.push(territorio_id); }
  if (tipo) { filtros.push(`e.tipo = $${i++}`); params.push(tipo); }
  params.push(parseInt(limite));

  const where = filtros.length ? 'WHERE ' + filtros.join(' AND ') : '';

  const { rows } = await pool.query(
    `SELECT e.*, u.nombre AS autor_nombre,
            ST_AsGeoJSON(e.geom)::jsonb AS geometry
     FROM eventos_mapa e
     LEFT JOIN usuarios u ON e.usuario_id = u.id
     ${where}
     ORDER BY e.created_at DESC
     LIMIT $${i}`,
    params
  );

  res.json({ exito: true, eventos: rows });
}

// ─────────────────────────────────────────────────────────────────
// Crear evento del mapa (REST + emit socket)
// ─────────────────────────────────────────────────────────────────
async function crearEventoMapa(req, res) {
  const { territorio_id, tipo, titulo, descripcion, latitud, longitud, datos_extra } = req.body;

  const geomSQL = (latitud != null && longitud != null)
    ? `ST_SetSRID(ST_MakePoint(${parseFloat(longitud)}, ${parseFloat(latitud)}), 4326)`
    : 'NULL';

  const { rows } = await pool.query(
    `INSERT INTO eventos_mapa
       (territorio_id, usuario_id, tipo, titulo, descripcion, latitud, longitud, geom, datos_extra)
     VALUES ($1, $2, $3, $4, $5, $6, $7, ${geomSQL}, $8)
     RETURNING *`,
    [
      territorio_id,
      req.usuario.id,
      tipo || 'general',
      titulo,
      descripcion || null,
      latitud || null,
      longitud || null,
      datos_extra ? JSON.stringify(datos_extra) : null,
    ]
  );

  const evento = rows[0];

  // Emitir en tiempo real
  const ns = getMapaNs();
  if (ns) {
    ns.to(`territorio:${territorio_id}`).emit('nuevo_evento', { ...evento, autor_nombre: req.usuario.nombre });
    ns.emit('evento_global', { ...evento, autor_nombre: req.usuario.nombre });
  }

  res.status(201).json({ exito: true, evento });
}

// ─────────────────────────────────────────────────────────────────
// Heatmap: densidad de contactos por territorio
// ─────────────────────────────────────────────────────────────────
async function heatmapContactos(req, res) {
  const { rows } = await pool.query(
    `SELECT
       t.id, t.nombre, t.nivel, t.latitud, t.longitud,
       COUNT(c.id) AS total_contactos,
       SUM(CASE WHEN c.activo THEN 1 ELSE 0 END) AS contactos_activos
     FROM territorios t
     LEFT JOIN contactos c ON c.territorio_id = t.id
     WHERE t.latitud IS NOT NULL AND t.longitud IS NOT NULL
     GROUP BY t.id, t.nombre, t.nivel, t.latitud, t.longitud
     ORDER BY total_contactos DESC`
  );

  res.json({ exito: true, heatmap: rows });
}

module.exports = {
  obtenerGeoJSON,
  territoriosCercanos,
  territoriosEnBBox,
  actualizarGeometria,
  listarEventosMapa,
  crearEventoMapa,
  heatmapContactos,
};
