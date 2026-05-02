const { Router } = require('express');
const ctrl = require('../controllers/dashboardController');
const { autenticar } = require('../middleware/auth');

const router = Router();
router.use(autenticar);

router.get('/resumen',      ctrl.obtenerResumen);
router.get('/indicadores',  ctrl.obtenerIndicadores);
router.get('/actividad',    ctrl.obtenerActividad);

module.exports = router;
