const http = require('http');
const { Server: SocketIO } = require('socket.io');
const app = require('./app');
const { pool } = require('./config/database');
const { iniciarSocketMapa, setMapaNs } = require('./sockets/mapaSocket');
const { iniciarSocketSocial } = require('./sockets/socialSocket');

const PUERTO = process.env.PORT || 5000;

// Crear servidor HTTP para poder adjuntar socket.io
const servidor = http.createServer(app);

// Configurar socket.io con CORS
const io = new SocketIO(servidor, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

// Iniciar namespace /mapa
const mapaNs = iniciarSocketMapa(io);
setMapaNs(mapaNs);

// Iniciar namespace /social
iniciarSocketSocial(io);

// Exponer io a los controladores vía app
app.set('io', io);

async function iniciar() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Conexión a PostgreSQL verificada');

    servidor.listen(PUERTO, () => {
      console.log('');
      console.log('╔════════════════════════════════════════╗');
      console.log('║   ÁBACO — Plataforma de Inteligencia  ║');
      console.log('║      Territorial · API + WebSocket     ║');
      console.log(`║   Servidor corriendo en puerto ${PUERTO}    ║`);
      console.log(`║   Entorno: ${(process.env.NODE_ENV || 'development').padEnd(29)}║`);
      console.log('╚════════════════════════════════════════╝');
      console.log('   Socket.io: ws://localhost:' + PUERTO + '/mapa');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
}

// Cierre elegante
async function cerrar() {
  console.log('\n🔄 Cerrando servidor...');
  io.close();
  await pool.end();
  process.exit(0);
}
process.on('SIGTERM', cerrar);
process.on('SIGINT', cerrar);

iniciar();
