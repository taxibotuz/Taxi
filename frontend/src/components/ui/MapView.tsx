import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { isInsideDistrict, getBoundary } from '../../services/geo';
import { useTranslation } from '../../i18n';

const defaultIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="width:12px;height:12px;background:#0c8ee7;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const pickupIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
    <div style="width:16px;height:16px;background:#22c55e;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const destinationIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
    <div style="width:16px;height:16px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const carIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🚗</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function pickupStatusIcon(inside: boolean) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
      <div style="width:16px;height:16px;background:${inside ? '#22c55e' : '#ef4444'};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function destStatusIcon(inside: boolean) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
      <div style="width:16px;height:16px;background:${inside ? '#22c55e' : '#ef4444'};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  pickup?: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  driverLocation?: { lat: number; lng: number } | null;
  route?: Array<{ lat: number; lng: number }>;
  height?: string;
  markers?: Array<{ lat: number; lng: number; icon?: string; label?: string }>;
  onClick?: (lat: number, lng: number) => void;
  onDrag?: (lat: number, lng: number) => void;
  showSatelliteToggle?: boolean;
  showETA?: boolean;
  etaSeconds?: number;
  distanceKm?: number;
}

const districtPolygon: [number, number][] = getBoundary().map(
  (p) => [p.lat, p.lng] as [number, number]
);

const TILE_LAYERS = {
  standard: {
    name: 'Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
};

function MapClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onClick) onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapCenterUpdater({ center }: { center?: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, map.getZoom(), { duration: 0.5 });
    }
  }, [map, center?.[0], center?.[1]]);
  return null;
}

export default function MapView({
  center = [41.55, 61.00],
  zoom = 13,
  pickup,
  destination,
  driverLocation,
  route,
  markers,
  onClick,
  showSatelliteToggle = true,
  showETA = false,
  etaSeconds,
  distanceKm,
}: MapViewProps) {
  const { t } = useTranslation();
  const [tileKey, setTileKey] = useState<'standard' | 'satellite'>('satellite');
  const pickupInside = pickup ? isInsideDistrict(pickup) : null;
  const destInside = destination ? isInsideDistrict(destination) : null;

  const toggleTiles = useCallback(() => {
    setTileKey((k) => (k === 'standard' ? 'satellite' : 'standard'));
  }, []);

  const tileLayer = TILE_LAYERS[tileKey];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full rounded-2xl overflow-hidden relative"
    >
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          key={tileKey}
          url={tileLayer.url}
          attribution={tileLayer.attribution}
        />
        <MapClickHandler onClick={onClick} />
        <MapCenterUpdater center={center} />

        <Polygon
          positions={districtPolygon}
          pathOptions={{
            color: '#00C853',
            weight: 3,
            fillColor: '#00C853',
            fillOpacity: 0.25,
          }}
        />

        {route && route.length >= 2 && (
          <Polyline
            positions={route.map(p => [p.lat, p.lng] as [number, number])}
            pathOptions={{
              color: '#3b82f6',
              weight: 4,
              opacity: 0.8,
              dashArray: route.length > 2 ? undefined : '10, 10',
            }}
          />
        )}

        {pickup && (
          <Marker
            position={[pickup.lat, pickup.lng]}
            icon={pickupInside !== null ? pickupStatusIcon(pickupInside) : pickupIcon}
          />
        )}
        {destination && (
          <Marker
            position={[destination.lat, destination.lng]}
            icon={destInside !== null ? destStatusIcon(destInside) : destinationIcon}
          />
        )}
        {driverLocation && <Marker position={[driverLocation.lat, driverLocation.lng]} icon={carIcon} />}
        {markers?.map((m, i) => (
          <Marker key={i} position={[m.lat, m.lng]} icon={defaultIcon}>
            {m.label && <Popup>{m.label}</Popup>}
          </Marker>
        ))}
      </MapContainer>

      {/* ETA Overlay */}
      {showETA && (etaSeconds || distanceKm) && (
        <div className="absolute bottom-4 left-3 right-3 sm:left-4 sm:right-4 z-[1000] glass rounded-card p-3 flex justify-between items-center shadow-lg">
          {distanceKm != null && (
            <div className="text-center">
              <div className="text-base sm:text-lg font-bold text-white">{distanceKm.toFixed(1)} km</div>
              <div className="text-[10px] text-gray-400">{t('distance_label')}</div>
            </div>
          )}
          {etaSeconds != null && (
            <div className="text-center">
              <div className="text-base sm:text-lg font-bold text-primary-400">{Math.ceil(etaSeconds / 60)} min</div>
              <div className="text-[10px] text-gray-400">{t('eta_label')}</div>
            </div>
          )}
          {driverLocation && (
            <div className="text-center">
              <div className="text-base sm:text-lg font-bold text-green-500">●</div>
              <div className="text-[10px] text-gray-400">{t('driver_label')}</div>
            </div>
          )}
        </div>
      )}

      {/* Satellite Toggle */}
      {showSatelliteToggle && (
        <button
          onClick={toggleTiles}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[1000] px-3 py-1.5 rounded-xl text-[11px] font-semibold shadow-lg backdrop-blur-md border border-white/10 active:scale-95 transition-all"
          style={{
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
          }}
        >
          🛰 {tileKey === 'standard' ? t('satellite') : t('standard')}
        </button>
      )}
    </motion.div>
  );
}
