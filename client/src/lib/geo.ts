// Location helpers: current coordinates, permission state, and the great-circle
// distance between two points. Used for the "distance between us" feature and the
// location gate on sending.

export interface Coords {
  lat: number;
  lon: number;
}

export function getCoords(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('no geolocation'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      reject,
      { timeout: 12000, maximumAge: 120000 }
    );
  });
}

export async function geoPermission(): Promise<'granted' | 'prompt' | 'denied' | 'unknown'> {
  try {
    if (!navigator.permissions) return 'unknown';
    const s = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return s.state as 'granted' | 'prompt' | 'denied';
  } catch {
    return 'unknown';
  }
}

export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371; // km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m apart`;
  if (km < 100) return `${km.toFixed(1)} km apart`;
  return `${Math.round(km)} km apart`;
}

const LS = 'pronto_my_coords';
export function saveMyCoords(c: Coords) {
  try {
    localStorage.setItem(LS, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}
export function loadMyCoords(): Coords | null {
  try {
    return JSON.parse(localStorage.getItem(LS) || 'null');
  } catch {
    return null;
  }
}
