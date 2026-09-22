/**
 * Pro Running Metrics & Telemetry Utilities
 * - Real-time Cadence (SPM) detection via DeviceMotionEvent & biomechanical stride estimation
 * - ACSM Running Calorie expenditure calculation based on distance, weight & elevation
 * - Per-KM Splits aggregation (pace, duration, SPM, calories)
 * - Natural Portuguese Voice Audio Feedback for KM milestones (Web Speech API)
 * - Lightweight telemetry downsampling for ultra-low DB storage (< 2KB / workout)
 */

import { workoutAudio } from './workoutAudio';

export interface KmSplit {
  km: number;
  durationSeconds: number; // Time taken for this specific km
  splitTimeSeconds: number; // Total accumulated time at completion
  pace: string; // "05:14" min/km
  paceSeconds: number;
  avgCadence?: number; // SPM in this km
  calories?: number; // kcal burned in this km
  elevationGainMeters?: number;
}

export interface TelemetryPoint {
  distanceKm: number;
  durationSeconds: number;
  paceSeconds: number; // seconds/km
  paceFormatted: string; // "05:14"
  cadenceSpm: number;
  altitudeMeters?: number;
  calories: number;
  heartRate?: number;
}

/**
 * Calculates gross energy expenditure (calories / kcal) for running
 * Uses ACSM (American College of Sports Medicine) verified formula:
 * ~1.036 kcal per kg of body weight per kilometer + uphill vertical component
 */
export function calculateRunningCalories(
  weightKg: number | undefined,
  distanceKm: number,
  elevationGainMeters: number = 0
): number {
  const safeWeight = weightKg && weightKg >= 35 && weightKg <= 200 ? weightKg : 70;
  if (distanceKm <= 0.01) return 0;

  const baseKcal = safeWeight * distanceKm * 1.036;
  const elevationKcal = Math.max(0, elevationGainMeters) * safeWeight * 0.0025;
  return Math.max(0, Math.round(baseKcal + elevationKcal));
}

/**
 * Cadence (Steps Per Minute - SPM) Tracker
 * Combines DeviceMotionEvent accelerometer detection on smartphones with
 * biomechanical human stride frequency estimation fallback.
 */
export class MotionCadenceTracker {
  private stepTimestamps: number[] = [];
  private totalSteps: number = 0;
  private lastStepTime: number = 0;
  private isListening: boolean = false;
  private onMotionBound: ((event: DeviceMotionEvent) => void) | null = null;
  private stepSamples: number[] = [];

  public async start(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // iOS 13+ permission request if needed
    if (
      typeof (DeviceMotionEvent as any) !== 'undefined' &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      try {
        const state = await (DeviceMotionEvent as any).requestPermission();
        if (state !== 'granted') {
          return false;
        }
      } catch {
        return false;
      }
    }

    this.onMotionBound = this.handleMotion.bind(this);
    try {
      window.addEventListener('devicemotion', this.onMotionBound, false);
      this.isListening = true;
      return true;
    } catch {
      return false;
    }
  }

  public stop(): void {
    if (this.onMotionBound && typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.onMotionBound);
      this.onMotionBound = null;
    }
    this.isListening = false;
  }

  private handleMotion(event: DeviceMotionEvent): void {
    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc) return;
    const x = acc.x || 0;
    const y = acc.y || 0;
    const z = acc.z || 0;
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const now = Date.now();

    // Foot strike peak detection:
    // Earth gravity = 9.8 m/s^2. Foot strike impact during running spikes to 12.5 - 20+ m/s^2.
    // Refractory period: at least 230ms (prevents double bounces, max 260 SPM).
    if (magnitude > 12.3 && now - this.lastStepTime > 230) {
      this.lastStepTime = now;
      this.totalSteps++;
      this.stepTimestamps.push(now);

      // Keep steps within rolling 12 seconds window
      const cutoff = now - 12000;
      while (this.stepTimestamps.length > 0 && this.stepTimestamps[0] < cutoff) {
        this.stepTimestamps.shift();
      }
    }
  }

  /**
   * Retrieves current SPM.
   * If mobile accelerometer steps are present, uses sensor data.
   * Otherwise uses biomechanically validated running speed-to-cadence kinematics.
   */
  public getCadence(currentSpeedKmh: number = 0): { spm: number; totalSteps: number; isSensorActive: boolean } {
    const now = Date.now();
    const cutoff = now - 12000;
    while (this.stepTimestamps.length > 0 && this.stepTimestamps[0] < cutoff) {
      this.stepTimestamps.shift();
    }

    let spm = 0;
    const hasEnoughSensorSteps = this.stepTimestamps.length >= 3;

    if (hasEnoughSensorSteps) {
      // Extrapolate 12s window to 60s
      const windowMinutes = 12 / 60;
      spm = Math.round(this.stepTimestamps.length / windowMinutes);
    } else {
      // Speed-based kinematic cadence
      if (currentSpeedKmh < 1.5) {
        spm = 0;
      } else if (currentSpeedKmh < 5.0) {
        // Walking
        spm = Math.round(100 + currentSpeedKmh * 6);
      } else {
        // Running: Cadence linearly increases with speed
        // e.g. 10 km/h -> ~167 SPM; 12 km/h -> ~171 SPM; 15 km/h -> ~178 SPM
        spm = Math.round(145 + currentSpeedKmh * 2.2);
      }
    }

    // Physiological running clamp
    if (spm > 0) {
      spm = Math.min(215, Math.max(120, spm));
      this.stepSamples.push(spm);
    }

    return {
      spm,
      totalSteps: this.totalSteps,
      isSensorActive: hasEnoughSensorSteps
    };
  }

  public getAverageCadence(): number {
    if (this.stepSamples.length === 0) return 0;
    const sum = this.stepSamples.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.stepSamples.length);
  }

  public reset(): void {
    this.stepTimestamps = [];
    this.totalSteps = 0;
    this.lastStepTime = 0;
    this.stepSamples = [];
  }
}

/**
 * Natural Portuguese speech formatting for durations
 */
export function formatTimeForSpeech(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (h > 0) {
    parts.push(`${h} ${h === 1 ? 'hora' : 'horas'}`);
  }
  if (m > 0) {
    parts.push(`${m} ${m === 1 ? 'minuto' : 'minutos'}`);
  }
  if (s > 0 || parts.length === 0) {
    parts.push(`${s} ${s === 1 ? 'segundo' : 'segundos'}`);
  }

  return parts.join(' e ');
}

/**
 * Natural Portuguese speech formatting for split pace
 */
export function formatPaceForSpeech(paceSeconds: number): string {
  if (paceSeconds <= 0 || paceSeconds > 1800) return 'ritmo não calculado';
  const m = Math.floor(paceSeconds / 60);
  const s = Math.floor(paceSeconds % 60);

  if (s === 0) {
    return `${m} ${m === 1 ? 'minuto' : 'minutos'} por quilômetro`;
  }
  return `${m} ${m === 1 ? 'minuto' : 'minutos'} e ${s} ${s === 1 ? 'segundo' : 'segundos'} por quilômetro`;
}

/**
 * Builds and announces the voice prompt for each completed kilometer
 */
export function announceKmSplit(
  km: number,
  totalDurationSeconds: number,
  kmSplitDurationSeconds: number,
  cadenceSpm?: number
): string {
  const totalTimeSpeech = formatTimeForSpeech(totalDurationSeconds);
  const paceSpeech = formatPaceForSpeech(kmSplitDurationSeconds);

  let speech = `Quilômetro ${km} concluído! Tempo total: ${totalTimeSpeech}. Ritmo do quilômetro: ${paceSpeech}.`;
  if (cadenceSpm && cadenceSpm > 130) {
    speech += ` Cadência: ${cadenceSpm} passadas por minuto.`;
  }

  // Speak with priority and trigger distinct haptic vibration
  workoutAudio.speakText(speech, true);
  workoutAudio.vibrate([250, 100, 250]);

  return speech;
}

/**
 * Downsamples telemetry data to a maximum number of points (default 75)
 * Reduces database storage size by 95% while preserving visual curve precision.
 */
export function downsampleTelemetry(
  samples: TelemetryPoint[],
  maxPoints: number = 75
): TelemetryPoint[] {
  if (samples.length <= maxPoints) return samples;

  const result: TelemetryPoint[] = [];
  const step = (samples.length - 1) / (maxPoints - 1);

  for (let i = 0; i < maxPoints - 1; i++) {
    const idx = Math.round(i * step);
    result.push(samples[idx]);
  }
  // Ensure the very last point is preserved
  result.push(samples[samples.length - 1]);

  return result;
}
