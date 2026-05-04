// Vercel serverless entry point
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const app = require('../src/app');
const { iniciarSocketMapa, setMapaNs } = require('../src/sockets/mapaSocket');
const { iniciarSocketSocial } = require('../src/sockets/socialSocket');

const servidor = http.createServer(app);

const io = new SocketIO(servidor, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['polling'], // Vercel no soporta WebSocket nativo, usa long-polling
});

const mapaNs = iniciarSocketMapa(io);
setMapaNs(mapaNs);
iniciarSocketSocial(io);
app.set('io', io);

module.exports = servidor;
