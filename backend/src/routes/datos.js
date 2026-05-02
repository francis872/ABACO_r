const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/datosController');
const { autenticar } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');

const router = Router();
router.use(autenticar);

// Contactos
router.get('/contactos',          ctrl.listarContactos);
router.get('/contactos/:id',      ctrl.obtenerContactoPorId);
router.post('/contactos', [
  body('nombres').notEmpty().withMessage('El nombre es requerido'),
], ctrl.crearContacto);
router.put('/contactos/:id',      ctrl.actualizarContacto);
router.delete('/contactos/:id',   requiereRol('coordinador'), ctrl.eliminarContacto);

// Campañas
router.get('/campanas',           ctrl.listarCampanas);
router.post('/campanas', requiereRol('admin'), [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
], ctrl.crearCampana);

// Tareas
router.get('/tareas',             ctrl.listarTareas);
router.post('/tareas', [
  body('titulo').notEmpty().withMessage('El título es requerido'),
], ctrl.crearTarea);
router.put('/tareas/:id',         ctrl.actualizarTarea);

module.exports = router;
