// Weather via the browser's location + free, key-less APIs:
//   Open-Meteo for the temperature, BigDataCloud for a city name (both CORS-ok).

export interface WeatherInfo {
  temp: number;
  city: string;
  code: number;
}

// WMO weather codes → an emoji.
export function weatherEmoji(code: number | null | undefined): string {
  if (code == null) return '🌡️';
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '🌨️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 85 && code <= 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('no geolocation'));
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 12000, maximumAge: 600000 });
  });
}

export async function fetchMyWeather(): Promise<WeatherInfo | null> {
  try {
    const pos = await getPosition();
    const { latitude: lat, longitude: lon } = pos.coords;
    const wRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`
    );
    const w = await wRes.json();
    const temp = Math.round(w?.current?.temperature_2m);
    const code = Number(w?.current?.weather_code ?? 0);
    if (!Number.isFinite(temp)) return null;
    let city = '';
    try {
      const gRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      );
      const g = await gRes.json();
      city = g?.city || g?.locality || g?.principalSubdivision || '';
    } catch {
      /* city is optional */
    }
    return { temp, city, code };
  } catch {
    return null;
  }
}

const LS = 'pronto_my_weather';
const LS_AT = 'pronto_my_weather_at';

export function saveMyWeather(w: WeatherInfo) {
  try {
    localStorage.setItem(LS, JSON.stringify(w));
    localStorage.setItem(LS_AT, String(Date.now()));
  } catch {
    /* ignore */
  }
}
export function loadMyWeather(): WeatherInfo | null {
  try {
    return JSON.parse(localStorage.getItem(LS) || 'null');
  } catch {
    return null;
  }
}
// True if we haven't fetched in the last `minutes`, so we don't spam APIs.
export function weatherStale(minutes = 20): boolean {
  try {
    const at = Number(localStorage.getItem(LS_AT) || 0);
    return Date.now() - at > minutes * 60_000;
  } catch {
    return true;
  }
}
