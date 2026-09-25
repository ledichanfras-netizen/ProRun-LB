/**
 * GPS & GPX Utility functions for ProRun LB
 * - Live GPS position tracking & haversine distance calculation
 * - Polyline compression (Google Encoded Polyline algorithm) to minimize database storage (under 10KB/workout)
 * - GPX file parsing (XML parser extracts coordinates, time, elevation, speed)
 */

import { KmSplit, TelemetryPoint, calculateRunningCalories, downsampleTelemetry } from './runningMetrics';

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
  elevationLossMeters?: number;
  avgHeartRate?: number;
  avgCadence?: number; // SPM
  maxCadence?: number; // SPM peak
  calories?: number; // kcal
  kmSplits?: KmSplit[]; // Parciais por KM
  telemetrySamples?: TelemetryPoint[]; // Stream de telemetria compactado
  source: 'live_gps' | 'gpx_file' | 'manual_or_indoor';
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
  const totalCalories = calculateRunningCalories(70, totalDistanceKm, totalElevationGain);

  // Compute km splits from raw points
  const kmSplits: KmSplit[] = [];
  const telemetrySamples: TelemetryPoint[] = [];
  let currentKmTarget = 1;
  let splitStartDist = 0;
  let splitStartTime = firstTime || 0;
  let accDist = 0;

  for (let i = 1; i < rawPoints.length; i++) {
    const prev = rawPoints[i - 1];
    const curr = rawPoints[i];
    const segDist = calculateHaversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    accDist += segDist;

    const currTime = curr.time || (firstTime ? firstTime + Math.round(accDist * 330 * 1000) : 0);
    const elapsedSec = firstTime ? Math.max(1, Math.round((currTime - firstTime) / 1000)) : Math.round(accDist * 330);
    const paceSec = accDist > 0 ? Math.round(elapsedSec / accDist) : 330;
    const speedKmh = paceSec > 0 ? 3600 / paceSec : 10;
    const estCadence = Math.min(205, Math.max(140, Math.round(145 + speedKmh * 2.2)));

    // Sample telemetry periodically (every ~80m)
    if (i % Math.max(1, Math.floor(rawPoints.length / 75)) === 0 || i === rawPoints.length - 1) {
      telemetrySamples.push({
        distanceKm: Number(accDist.toFixed(2)),
        durationSeconds: elapsedSec,
        paceSeconds: paceSec,
        paceFormatted: formatPace(elapsedSec, accDist),
        cadenceSpm: estCadence,
        altitudeMeters: curr.ele ? Math.round(curr.ele) : undefined,
        calories: calculateRunningCalories(70, accDist, totalElevationGain * (accDist / (totalDistanceKm || 1)))
      });
    }

    if (accDist >= currentKmTarget) {
      const splitDuration = firstTime ? Math.max(1, Math.round((currTime - splitStartTime) / 1000)) : 330;
      const splitDist = accDist - splitStartDist;
      kmSplits.push({
        km: currentKmTarget,
        durationSeconds: splitDuration,
        splitTimeSeconds: elapsedSec,
        pace: formatPace(splitDuration, splitDist || 1),
        paceSeconds: Math.round(splitDuration / (splitDist || 1)),
        avgCadence: estCadence,
        calories: calculateRunningCalories(70, 1, totalElevationGain / Math.max(1, totalDistanceKm))
      });
      currentKmTarget++;
      splitStartDist = accDist;
      splitStartTime = currTime;
    }
  }

  // Final partial split if remaining > 300m
  if (accDist - splitStartDist >= 0.3) {
    const finalSec = totalDurationSeconds - (kmSplits.reduce((sum, s) => sum + s.durationSeconds, 0));
    const finalDist = accDist - splitStartDist;
    if (finalSec > 0 && finalDist > 0) {
      kmSplits.push({
        km: currentKmTarget,
        durationSeconds: finalSec,
        splitTimeSeconds: totalDurationSeconds,
        pace: formatPace(finalSec, finalDist),
        paceSeconds: Math.round(finalSec / finalDist),
        avgCadence: 168,
        calories: calculateRunningCalories(70, finalDist)
      });
    }
  }

  const avgSpeedKmh = totalDurationSeconds > 0 ? (totalDistanceKm / (totalDurationSeconds / 3600)) : 10;
  const avgCadence = Math.min(200, Math.max(145, Math.round(145 + avgSpeedKmh * 2.2)));

  return {
    polyline,
    points: sampledPoints,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    totalDurationSeconds,
    avgPace,
    avgCadence,
    maxCadence: avgCadence + 14,
    calories: totalCalories,
    kmSplits: kmSplits.length > 0 ? kmSplits : undefined,
    telemetrySamples: downsampleTelemetry(telemetrySamples, 75),
    elevationGainMeters: Math.round(totalElevationGain),
    source: 'gpx_file',
    recordedAt: new Date().toISOString()
  };
}

/**
 * ============================================================================
 * SISTEMA DE BLINDAGEM E AUTO-RECUPERAÇÃO DE CORRIDA (CRASH & BACK-BUTTON GUARD)
 * Salva continuamente o progresso do treino no dispositivo para evitar perda
 * por toque acidental no botão Voltar, fechamento de aba ou queda de bateria.
 * ============================================================================
 */
export const ACTIVE_WORKOUT_BACKUP_KEY = 'prorun_active_gps_workout_backup_v1';

export interface ActiveWorkoutBackup {
  workoutType: string;
  workoutDescription?: string;
  plannedDistanceKm?: number;
  athleteWeight: number;
  weekIndex?: number;
  dayIndex?: number;
  distanceKm: number;
  durationSeconds: number;
  currentPace: string;
  gpsPoints: [number, number][];
  currentPosition: [number, number] | null;
  elevationGainMeters: number;
  currentCalories: number;
  currentCadence: number;
  maxCadence: number;
  heartRateAverage: number | null;
  heartRateMax: number | null;
  kmSplits: KmSplit[];
  telemetrySamples: TelemetryPoint[];
  activeStepIndex: number;
  stepDistanceMeters: number;
  stepDurationSeconds: number;
  completedSteps: any[];
  activeStructured?: any;
  savedAt: string; // ISO string
}

export function saveActiveWorkoutBackup(backup: ActiveWorkoutBackup): void {
  try {
    // Keep max 600 points in localStorage checkpoint for fast, lightweight writes
    const maxPts = 600;
    let pts = backup.gpsPoints;
    if (pts.length > maxPts) {
      const step = Math.ceil(pts.length / maxPts);
      pts = pts.filter((_, idx) => idx % step === 0 || idx === pts.length - 1);
    }
    const payload: ActiveWorkoutBackup = {
      ...backup,
      gpsPoints: pts,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(ACTIVE_WORKOUT_BACKUP_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Auto-save workout backup warning:', err);
  }
}

export function getActiveWorkoutBackup(): ActiveWorkoutBackup | null {
  try {
    const raw = localStorage.getItem(ACTIVE_WORKOUT_BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveWorkoutBackup;
    // Validate that backup has meaningful progress (at least 3 seconds or any distance)
    if (!parsed || (parsed.durationSeconds < 3 && parsed.distanceKm <= 0)) {
      return null;
    }
    // Discard backups older than 24 hours
    const savedTime = new Date(parsed.savedAt).getTime();
    if (isNaN(savedTime) || Date.now() - savedTime > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(ACTIVE_WORKOUT_BACKUP_KEY);
      return null;
    }
    return parsed;
  } catch (err) {
    return null;
  }
}

export function clearActiveWorkoutBackup(): void {
  try {
    localStorage.removeItem(ACTIVE_WORKOUT_BACKUP_KEY);
  } catch (err) {}
}

export function convertBackupToRouteData(backup: ActiveWorkoutBackup): RouteData {
  const hasGps = backup.gpsPoints && backup.gpsPoints.length >= 2 && backup.distanceKm >= 0.02;
  const polyline = hasGps ? encodePolyline(backup.gpsPoints) : '';
  const avgPace = hasGps ? formatPace(backup.durationSeconds, backup.distanceKm) : backup.currentPace || '00:00';
  const finalCalories = backup.currentCalories || calculateRunningCalories(backup.athleteWeight || 70, backup.distanceKm, backup.elevationGainMeters);

  return {
    polyline,
    points: backup.gpsPoints || [],
    totalDistanceKm: Number((backup.distanceKm || 0).toFixed(2)),
    totalDurationSeconds: backup.durationSeconds || 0,
    avgPace,
    elevationGainMeters: backup.elevationGainMeters || undefined,
    avgCadence: backup.currentCadence > 0 ? backup.currentCadence : undefined,
    maxCadence: backup.maxCadence > 0 ? backup.maxCadence : undefined,
    calories: finalCalories,
    kmSplits: backup.kmSplits && backup.kmSplits.length > 0 ? backup.kmSplits : undefined,
    telemetrySamples: backup.telemetrySamples && backup.telemetrySamples.length > 0 ? downsampleTelemetry(backup.telemetrySamples, 75) : undefined,
    source: hasGps ? 'live_gps' : 'manual_or_indoor',
    recordedAt: backup.savedAt || new Date().toISOString(),
    avgHeartRate: backup.heartRateAverage || undefined,
    completedSteps: backup.completedSteps && backup.completedSteps.length > 0 ? backup.completedSteps : undefined
  };
}

