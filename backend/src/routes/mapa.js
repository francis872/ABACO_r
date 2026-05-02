const express = require('express');
const router = express.Router();
const { autenticar } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');
const {
  obtenerGeoJSON,
  territoriosCercanos,
  territoriosEnBBox,
  actualizarGeometria,
  listarEventosMapa,
  crearEventoMapa,
  heatmapContactos,
} = require('../controllers/mapaController');

// Todas las rutas requieren autenticación
router.use(autenticar);

// GeoJSON completo para renderizar el mapa
router.get('/geojson', obtenerGeoJSON);

// Territorios dentro de un radio
router.get('/cercanos', territoriosCercanos);

// Territorios en bounding box (viewport del mapa)
router.get('/bbox', territoriosEnBBox);

// Heatmap de contactos
router.get('/heatmap', heatmapContactos);

// Eventos del mapa
router.get('/eventos', listarEventosMapa);
router.post('/eventos', crearEventoMapa);

// Actualizar geometría de un territorio (rol mínimo: coordinador)
router.put('/territorios/:id/geometria', requiereRol('coordinador'), actualizarGeometria);

module.exports = router;
