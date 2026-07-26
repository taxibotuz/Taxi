import { useEffect, useRef, useCallback, useState } from 'react';
import { emitLocationUpdate } from '../services/socket';

interface UseLocationTrackingOptions {
  enabled: boolean;
  intervalMs?: number;
  distanceThresholdMeters?: number;
}

interface UseLocationTrackingResult {
  isTracking: boolean;
  gpsAvailable: boolean;
  lastPosition: { lat: number; lng: number } | null;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useLocationTracking({
  enabled,
  intervalMs = 7000,
  distanceThresholdMeters = 20,
}: UseLocationTrackingOptions): UseLocationTrackingResult {
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastSentTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [gpsAvailable, setGpsAvailable] = useState(true);
  const [lastPosition, setLastPosition] = useState<{ lat: number; lng: number } | null>(null);
  const latestPositionRef = useRef<GeolocationPosition | null>(null);

  const sendPosition = useCallback((pos: GeolocationPosition) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const now = Date.now();

    setLastPosition({ lat, lng });

    if (lastSentRef.current) {
      const dist = haversineDistance(lastSentRef.current.lat, lastSentRef.current.lng, lat, lng);
      if (dist < distanceThresholdMeters && now - lastSentTimeRef.current < intervalMs) {
        return;
      }
    }

    emitLocationUpdate(lat, lng);
    lastSentRef.current = { lat, lng };
    lastSentTimeRef.current = now;
  }, [intervalMs, distanceThresholdMeters]);

  const handleError = useCallback((error: GeolocationPositionError) => {
    if (error.code === error.PERMISSION_DENIED || error.code === error.POSITION_UNAVAILABLE) {
      setGpsAvailable(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsTracking(false);
      lastSentRef.current = null;
      lastSentTimeRef.current = 0;
      return;
    }

    if (!navigator.geolocation) {
      setGpsAvailable(false);
      return;
    }

    setGpsAvailable(true);
    setIsTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        latestPositionRef.current = pos;
        setGpsAvailable(true);
        sendPosition(pos);
      },
      handleError,
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    intervalRef.current = setInterval(() => {
      if (latestPositionRef.current) {
        sendPosition(latestPositionRef.current);
      }
    }, intervalMs);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsTracking(false);
      lastSentRef.current = null;
      lastSentTimeRef.current = 0;
    };
  }, [enabled, intervalMs, sendPosition, handleError]);

  return { isTracking, gpsAvailable, lastPosition };
}
