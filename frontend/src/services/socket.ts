import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || '';

let socket: Socket | null = null;

export const connectSocket = (token: string) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL || '/', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => socket;

export const subscribeToRideUpdates = (callback: (data: any) => void) => {
  const s = getSocket();
  if (!s) return () => {};

  s.on('ride:accepted', callback);
  s.on('ride:arrived', callback);
  s.on('ride:started', callback);
  s.on('ride:completed', callback);
  s.on('ride:cancelled', callback);
  s.on('search:status', callback);

  return () => {
    s.off('ride:accepted', callback);
    s.off('ride:arrived', callback);
    s.off('ride:started', callback);
    s.off('ride:completed', callback);
    s.off('ride:cancelled', callback);
    s.off('search:status', callback);
  };
};

export const subscribeToDriverLocation = (callback: (data: any) => void) => {
  const s = getSocket();
  if (!s) return () => {};
  s.on('driver:location', callback);
  return () => s.off('driver:location', callback);
};

export const emitLocationUpdate = (lat: number, lng: number) => {
  const s = getSocket();
  if (s) s.emit('location:update', { lat, lng });
};

export const emitRideAccept = (rideId: string) => {
  const s = getSocket();
  if (s) s.emit('ride:accept', { rideId });
};
