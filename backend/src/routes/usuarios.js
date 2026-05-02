const { Router } = require('express');
const { body } = require('express-validator');
const { listar, obtenerPorId, crear, actualizar, desactivar } = require('../controllers/usuariosController');
const { autenticar } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');

const router = Router();
router.use(autenticar);

router.get('/', requiereRol('admin'), listar);
router.get('/:id', requiereRol('coordinador'), obtenerPorId);

router.post('/', requiereRol('admin'), [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('apellido').notEmpty().withMessage('El apellido es requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
], crear);

router.put('/:id', requiereRol('admin'), actualizar);
router.delete('/:id', requiereRol('superadmin'), desactivar);

module.exports = router;
