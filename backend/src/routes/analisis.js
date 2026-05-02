const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/analisisController');
const { autenticar } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');

const router = Router();
router.use(autenticar);

// Análisis
router.get('/territorial',    ctrl.analisisTerritorial);
router.get('/comparativo',    ctrl.analisisComparativo);
router.get('/tendencias',     ctrl.analizarTendencias);
router.get('/financiero',     ctrl.analisisFinanciero);
router.post('/simulacion',    requiereRol('estratega'), ctrl.simularEscenario);

// Alertas
router.get('/alertas',        ctrl.listarAlertas);
router.post('/alertas', [
  body('titulo').notEmpty().withMessage('El título es requerido'),
], ctrl.crearAlerta);
router.put('/alertas/:id/resolver', requiereRol('coordinador'), ctrl.resolverAlerta);

// Financiero
router.get('/transacciones',  ctrl.listarTransacciones);
router.post('/transacciones', [
  body('tipo').isIn(['ingreso','egreso','donacion']).withMessage('Tipo inválido'),
  body('monto').isFloat({ min: 0.01 }).withMessage('Monto inválido'),
  body('descripcion').notEmpty().withMessage('La descripción es requerida'),
  body('fecha').isDate().withMessage('Fecha inválida'),
], ctrl.crearTransaccion);

module.exports = router;
