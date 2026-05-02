/**
 * socketService.ts
 * Singleton de conexión WebSocket al namespace /mapa de ÁBACO.
 */

import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = useAuthStore.getState().token;
    const BACKEND = import.meta.env.VITE_API_URL
      || `${window.location.protocol}//${window.location.hostname}:5000`
    socket = io(`${BACKEND}/mapa`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Conectado al mapa en tiempo real:', socket?.id);
    });
    socket.on('disconnect', (reason) => {
      console.log('[Socket] Desconectado:', reason);
    });
    socket.on('connect_error', (err) => {
      console.error('[Socket] Error de conexión:', err.message);
    });
  }
  return socket;
}

export function desconectarSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
