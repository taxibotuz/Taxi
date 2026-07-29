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
    // Socket connected
  });

  socket.on('disconnect', () => {
    // Socket disconnected
  });

  socket.on('connect_error', () => {
    // Socket connection error - will auto-reconnect
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
  s.on('ride:in_progress', callback);
  s.on('ride:completed', callback);
  s.on('ride:cancelled', callback);
  s.on('search:status', callback);

  return () => {
    s.off('ride:accepted', callback);
    s.off('ride:arrived', callback);
    s.off('ride:in_progress', callback);
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

export const subscribeToRideRequests = (callback: (data: any) => void) => {
  const s = getSocket();
  if (!s) return () => {};

  s.on('ride:request', callback);
  s.on('ride:cancelled', callback);
  s.on('ride:taken', callback);

  return () => {
    s.off('ride:request', callback);
    s.off('ride:cancelled', callback);
    s.off('ride:taken', callback);
  };
};

export const subscribeToAdminUpdates = (callback: (data: any) => void) => {
  const s = getSocket();
  if (!s) return () => {};

  s.on('admin:ride:update', callback);
  s.on('admin:driver:update', callback);
  s.on('driver:location', callback);

  return () => {
    s.off('admin:ride:update', callback);
    s.off('admin:driver:update', callback);
    s.off('driver:location', callback);
  };
};

export const emitLocationUpdate = (lat: number, lng: number) => {
  const s = getSocket();
  if (s) s.emit('location:update', { lat, lng });
};

export const emitRideAccept = (rideId: string) => {
  const s = getSocket();
  if (s) s.emit('ride:accept', { rideId });
};

export const emitRideReject = (rideId: string, reason?: string) => {
  const s = getSocket();
  if (s) s.emit('ride:reject', { rideId, reason });
};

export const emitDriverStatus = (status: string) => {
  const s = getSocket();
  if (s) s.emit('driver:status', { status });
};

export const emitMatchingMode = (mode: 'nearby' | 'all') => {
  const s = getSocket();
  if (s) s.emit('admin:matching-mode', { mode });
};

export const subscribeToMatchingMode = (callback: (data: { mode: 'nearby' | 'all' }) => void) => {
  const s = getSocket();
  if (!s) return () => {};
  s.on('admin:matching-mode', callback);
  return () => s.off('admin:matching-mode', callback);
};
