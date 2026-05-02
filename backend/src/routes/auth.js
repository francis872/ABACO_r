const { Router } = require('express');
const { body } = require('express-validator');
const { login, registro, obtenerPerfil, cambiarPassword } = require('../controllers/authController');
const { autenticar } = require('../middleware/auth');

const router = Router();

// POST /api/auth/registro (pública)
router.post('/registro', [
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido')
    .isLength({ max: 100 }).withMessage('Nombre demasiado largo'),
  body('apellido').trim().notEmpty().withMessage('El apellido es requerido')
    .isLength({ max: 100 }).withMessage('Apellido demasiado largo'),
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
], registro);

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
], login);

// GET /api/auth/perfil (protegida)
router.get('/perfil', autenticar, obtenerPerfil);

// PUT /api/auth/cambiar-password (protegida)
router.put('/cambiar-password', autenticar, [
  body('passwordActual').notEmpty().withMessage('La contraseña actual es requerida'),
  body('passwordNueva').isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres'),
], cambiarPassword);

module.exports = router;
