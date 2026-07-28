export interface GeoPoint {
  lat: number;
  lng: number;
}

export const districtConfig = {
  name: "To'rtko'l tumani",
  center: { lat: 41.55, lng: 61.00 },
  zoom: 13,
  boundary: [
    { lat: 41.85, lng: 60.40 },
    { lat: 41.88, lng: 60.80 },
    { lat: 41.85, lng: 61.20 },
    { lat: 41.80, lng: 61.55 },
    { lat: 41.55, lng: 61.60 },
    { lat: 41.30, lng: 61.50 },
    { lat: 41.25, lng: 61.00 },
    { lat: 41.28, lng: 60.45 },
    { lat: 41.50, lng: 60.35 },
  ],
} as const;

export function isInsidePolygon(point: GeoPoint, polygon: GeoPoint[] | readonly GeoPoint[]): boolean {
  let inside = false;
  const { lat, lng } = point;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng;
      const yi = polygon[i].lat;
      const xj = polygon[j].lng;
      const yj = polygon[j].lat;

      const intersect = (yi > lat) !== (yj > lat)
        && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi;

      if (intersect) inside = !inside;
  }

  return inside;
}

export function getDefaultCenter(): GeoPoint {
  return { lat: districtConfig.center.lat, lng: districtConfig.center.lng };
}

export function isInsideDistrict(point: GeoPoint): boolean {
  return isInsidePolygon(point, getBoundary());
}

let boundaryOverride: GeoPoint[] | null = null;

export function setBoundary(boundary: GeoPoint[]): void {
  boundaryOverride = boundary;
}

export function getBoundary(): GeoPoint[] {
  if (boundaryOverride) return boundaryOverride;
  return districtConfig.boundary as unknown as GeoPoint[];
}

export async function loadSettingsBoundary(): Promise<void> {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const res = await fetch(`${apiUrl}/api/settings`);
    if (!res.ok) return;
    const data = await res.json();
    const boundary = data.district?.boundary;
    if (boundary?.length) {
      setBoundary(boundary as GeoPoint[]);
    }
  } catch {
    // use default boundary
  }
}
