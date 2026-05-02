const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { manejarErrores, noEncontrado } = require('./middleware/errorHandler');

// Rutas
const authRoutes       = require('./routes/auth');
const usuariosRoutes   = require('./routes/usuarios');
const territorioRoutes = require('./routes/territorio');
const datosRoutes      = require('./routes/datos');
const dashboardRoutes  = require('./routes/dashboard');
const analisisRoutes       = require('./routes/analisis');
const mapaRoutes           = require('./routes/mapa');
const publicacionesRoutes  = require('./routes/publicaciones');

const app = express();

// =====================================================
// SEGURIDAD Y MIDDLEWARES BASE
// =====================================================

// Helmet: cabeceras de seguridad HTTP
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS: solo permite peticiones del frontend configurado
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting: máximo 100 peticiones por 15 minutos por IP
const limitador = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { exito: false, mensaje: 'Demasiadas peticiones. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limitador);

// Rate limiting más estricto para autenticación
const limitadorAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { exito: false, mensaje: 'Demasiados intentos de acceso. Intenta de nuevo más tarde.' },
});
app.use('/api/auth/login', limitadorAuth);

// Parseo de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging en desarrollo
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// =====================================================
// RUTAS DE LA API
// =====================================================

app.use('/api/auth',       authRoutes);
app.use('/api/usuarios',   usuariosRoutes);
app.use('/api/territorio', territorioRoutes);
app.use('/api/datos',      datosRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/analisis',       analisisRoutes);
app.use('/api/mapa',           mapaRoutes);
app.use('/api/publicaciones',  publicacionesRoutes);

// Servir archivos subidos por usuarios
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Ruta de salud del servidor
app.get('/api/salud', (req, res) => {
  res.json({
    exito: true,
    servicio: 'ÁBACO API',
    version: '1.0.0',
    estado: 'operativo',
    timestamp: new Date().toISOString(),
  });
});

// =====================================================
// MANEJO DE ERRORES
// =====================================================

app.use(noEncontrado);
app.use(manejarErrores);

module.exports = app;
