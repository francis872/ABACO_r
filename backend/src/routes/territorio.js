const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/territorioController');
const { autenticar } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');

const router = Router();
router.use(autenticar);

// Territorios
router.get('/',         ctrl.listarTerritorios);
router.get('/:id',      ctrl.obtenerTerritorioPorId);
router.post('/', requiereRol('analista'), [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('nivel').notEmpty().withMessage('El nivel es requerido'),
], ctrl.crearTerritorio);
router.put('/:id',      requiereRol('analista'), ctrl.actualizarTerritorio);
router.delete('/:id',   requiereRol('admin'), ctrl.eliminarTerritorio);

// Resultados electorales
router.get('/resultados/lista',      ctrl.listarResultados);
router.post('/resultados/nuevo', requiereRol('analista'), ctrl.crearResultado);

// Elecciones
router.get('/elecciones/lista',      ctrl.listarElecciones);
router.post('/elecciones/nueva', requiereRol('admin'), ctrl.crearEleccion);

module.exports = router;
