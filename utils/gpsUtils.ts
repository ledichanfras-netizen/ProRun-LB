/**
 * GPS & GPX Utility functions for ProRun LB
 * - Live GPS position tracking & haversine distance calculation
 * - Polyline compression (Google Encoded Polyline algorithm) to minimize database storage (under 10KB/workout)
 * - GPX file parsing (XML parser extracts coordinates, time, elevation, speed)
 */

export interface GpsPoint {
  lat: number;
  lng: number;
  time?: number; // timestamp ms
  altitude?: number; // meters
}

export interface RouteData {
  polyline: string;
  points: [number, number][]; // [lat, lng] array
  totalDistanceKm: number;
  totalDurationSeconds: number;
  avgPace: string; // "05:20" min/km
  maxSpeedKmh?: number;
  elevationGainMeters?: number;
  avgHeartRate?: number;
  source: 'live_gps' | 'gpx_file';
  recordedAt: string;
  completedSteps?: {
    stepId: string;
    name: string;
    type: string;
    targetType: string;
    targetValue: number;
    completedDistanceMeters: number;
    completedDurationSeconds: number;
    avgPace: string;
  }[];
}

/**
 * Calculates distance between two GPS coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Encodes array of [lat, lng] points into a lightweight Polyline string
 * Reduces storage requirement by 90%+ compared to storing full raw point arrays
 */
export function encodePolyline(points: [number, number][]): string {
  let result = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const [lat, lng] of points) {
    const late5 = Math.round(lat * 1e5);
    const lnge5 = Math.round(lng * 1e5);

    const dLat = late5 - prevLat;
    const dLng = lnge5 - prevLng;

    prevLat = late5;
    prevLng = lnge5;

    result += encodeSignedNumber(dLat) + encodeSignedNumber(dLng);
  }

  return result;
}

function encodeSignedNumber(num: number): string {
  let sgn_num = num < 0 ? ~(num << 1) : num << 1;
  let encodeString = '';
  while (sgn_num >= 0x20) {
    encodeString += String.fromCharCode((0x20 | (sgn_num & 0x1f)) + 63);
    sgn_num >>= 5;
  }
  encodeString += String.fromCharCode(sgn_num + 63);
  return encodeString;
}

/**
 * Decodes a Polyline string back into [lat, lng] coordinates
 */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

/**
 * Formats pace in min/km (e.g. 330 seconds/km -> "05:30")
 */
export function formatPace(totalSeconds: number, distanceKm: number): string {
  if (distanceKm <= 0.05 || totalSeconds <= 0) return '--:--';
  const secPerKm = totalSeconds / distanceKm;
  if (secPerKm > 1800) return '--:--'; // > 30 min/km
  const minutes = Math.floor(secPerKm / 60);
  const seconds = Math.floor(secPerKm % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Formats time duration in hh:mm:ss or mm:ss
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Parses GPX (GPS Exchange Format XML) from GPS watches, Strava, Apple Watch, Polar, Coros
 */
export function parseGpxFile(gpxXmlText: string): RouteData {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxXmlText, 'application/xml');

  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Arquivo GPX corrompido ou formato XML inválido.');
  }

  const trkpts = xmlDoc.querySelectorAll('trkpt');
  if (!trkpts || trkpts.length === 0) {
    throw new Error('Nenhum ponto de rastreamento GPS encontrado no arquivo GPX.');
  }

  const rawPoints: { lat: number; lng: number; time?: number; ele?: number }[] = [];
  let totalDistanceKm = 0;
  let totalElevationGain = 0;
  let lastEle: number | null = null;

  for (let i = 0; i < trkpts.length; i++) {
    const pt = trkpts[i];
    const lat = parseFloat(pt.getAttribute('lat') || '');
    const lon = parseFloat(pt.getAttribute('lon') || '');

    if (isNaN(lat) || isNaN(lon)) continue;

    const timeEl = pt.querySelector('time');
    const eleEl = pt.querySelector('ele');

    const time = timeEl && timeEl.textContent ? new Date(timeEl.textContent).getTime() : undefined;
    const ele = eleEl && eleEl.textContent ? parseFloat(eleEl.textContent) : undefined;

    if (ele !== undefined && !isNaN(ele)) {
      if (lastEle !== null && ele > lastEle) {
        totalElevationGain += ele - lastEle;
      }
      lastEle = ele;
    }

    if (rawPoints.length > 0) {
      const prev = rawPoints[rawPoints.length - 1];
      const d = calculateHaversineDistance(prev.lat, prev.lng, lat, lon);
      totalDistanceKm += d;
    }

    rawPoints.push({ lat, lng: lon, time, ele });
  }

  if (rawPoints.length < 2) {
    throw new Error('O arquivo GPX possui dados de rota insuficientes.');
  }

  // Calculate duration
  let totalDurationSeconds = 0;
  const firstTime = rawPoints[0].time;
  const lastTime = rawPoints[rawPoints.length - 1].time;

  if (firstTime && lastTime && lastTime > firstTime) {
    totalDurationSeconds = Math.round((lastTime - firstTime) / 1000);
  } else {
    // Estimate based on standard 5:30 pace if timestamps not present
    totalDurationSeconds = Math.round(totalDistanceKm * 330);
  }

  // Simplify points to reduce polyline footprint (take max 800 sampled points for ultra long runs)
  const sampledPoints: [number, number][] = [];
  const step = Math.max(1, Math.floor(rawPoints.length / 800));
  for (let i = 0; i < rawPoints.length; i += step) {
    sampledPoints.push([rawPoints[i].lat, rawPoints[i].lng]);
  }
  // Always include the finish point
  const lastPt = rawPoints[rawPoints.length - 1];
  if (sampledPoints[sampledPoints.length - 1][0] !== lastPt.lat) {
    sampledPoints.push([lastPt.lat, lastPt.lng]);
  }

  const polyline = encodePolyline(sampledPoints);
  const avgPace = formatPace(totalDurationSeconds, totalDistanceKm);

  return {
    polyline,
    points: sampledPoints,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    totalDurationSeconds,
    avgPace,
    elevationGainMeters: Math.round(totalElevationGain),
    source: 'gpx_file',
    recordedAt: new Date().toISOString()
  };
}
