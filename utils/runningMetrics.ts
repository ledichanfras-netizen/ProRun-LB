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
 * Combines high-pass filtered DeviceMotionEvent accelerometer detection on smartphones with
 * biomechanical human stride frequency estimation & GPS sensor fusion.
 */
export class MotionCadenceTracker {
  private stepTimestamps: number[] = [];
  private totalSteps: number = 0;
  private lastStepTime: number = 0;
  private isListening: boolean = false;
  private onMotionBound: ((event: DeviceMotionEvent) => void) | null = null;
  private stepSamples: number[] = [];

  // Low-pass / gravity filter states
  private gravityX: number = 0;
  private gravityY: number = 0;
  private gravityZ: number = 0;
  private isGravityInitialized: boolean = false;

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
    const rawAcc = event.accelerationIncludingGravity || event.acceleration;
    if (!rawAcc) return;
    const x = rawAcc.x || 0;
    const y = rawAcc.y || 0;
    const z = rawAcc.z || 0;
    const now = Date.now();

    // 1. Exponential Moving Average (EMA) to isolate the static 1G gravity vector
    const alpha = 0.85;
    if (!this.isGravityInitialized) {
      this.gravityX = x;
      this.gravityY = y;
      this.gravityZ = z;
      this.isGravityInitialized = true;
    } else {
      this.gravityX = alpha * this.gravityX + (1 - alpha) * x;
      this.gravityY = alpha * this.gravityY + (1 - alpha) * y;
      this.gravityZ = alpha * this.gravityZ + (1 - alpha) * z;
    }

    // 2. High-pass filter: Dynamic linear acceleration without gravity
    const dynX = x - this.gravityX;
    const dynY = y - this.gravityY;
    const dynZ = z - this.gravityZ;
    const dynamicMagnitude = Math.sqrt(dynX * dynX + dynY * dynY + dynZ * dynZ);

    // 3. Foot strike impact detection:
    // When running with the smartphone in pocket, hand or arm strap, true foot strike generates a distinct
    // vertical shock wave of 3.8 - 12+ m/s^2.
    // Refractory period: at least 295ms (prevents double bounces/rebound harmonic spikes, capping max sprint at ~200 SPM).
    if (dynamicMagnitude > 3.6 && now - this.lastStepTime > 295) {
      this.lastStepTime = now;
      this.totalSteps++;
      this.stepTimestamps.push(now);

      // Keep steps within rolling 10 seconds window
      const cutoff = now - 10000;
      while (this.stepTimestamps.length > 0 && this.stepTimestamps[0] < cutoff) {
        this.stepTimestamps.shift();
      }
    }
  }

  /**
   * Biomechanically validated speed-to-cadence kinematics for running
   */
  public getKinematicCadence(speedKmh: number): number {
    if (speedKmh < 1.5) return 0;
    if (speedKmh < 6.0) {
      // Walking (3 - 6 km/h) -> ~105 - 122 SPM
      return Math.round(95 + speedKmh * 4.5);
    }
    if (speedKmh < 9.0) {
      // Easy Jogging (6 - 9 km/h, 6:40-10:00/km) -> ~150 - 162 SPM
      return Math.round(136 + speedKmh * 2.8);
    }
    if (speedKmh < 13.0) {
      // Moderate Running (9 - 13 km/h, 4:37-6:40/km) -> ~162 - 173 SPM
      return Math.round(144 + speedKmh * 2.2);
    }
    if (speedKmh < 17.0) {
      // Threshold / Fast (13 - 17 km/h, 3:30-4:37/km) -> ~173 - 183 SPM
      return Math.round(152 + speedKmh * 1.8);
    }
    // Sprints (> 17 km/h) -> ~184 - 198 SPM
    return Math.round(162 + Math.min(10, speedKmh - 17) * 1.6);
  }

  /**
   * Retrieves current SPM.
   * Combines mobile accelerometer step rate with GPS speed sensor fusion.
   */
  public getCadence(currentSpeedKmh: number = 0): { spm: number; totalSteps: number; isSensorActive: boolean } {
    const now = Date.now();
    const cutoff = now - 10000;
    while (this.stepTimestamps.length > 0 && this.stepTimestamps[0] < cutoff) {
      this.stepTimestamps.shift();
    }

    const kinematicSpm = this.getKinematicCadence(currentSpeedKmh);
    const hasRecentSensorSteps = this.stepTimestamps.length >= 3 && (now - this.lastStepTime < 3500);

    let spm = 0;

    if (hasRecentSensorSteps) {
      // Calculate inter-step intervals rather than raw window division to avoid quantization jitter
      const intervals: number[] = [];
      for (let i = 1; i < this.stepTimestamps.length; i++) {
        intervals.push(this.stepTimestamps[i] - this.stepTimestamps[i - 1]);
      }
      const avgIntervalMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      let rawSensorSpm = Math.round(60000 / avgIntervalMs);

      // Sanity bounds check: human running cadence is 120-205 SPM.
      // If runner is moving at a known GPS speed, fuse with kinematic baseline to reject phone shaking
      if (currentSpeedKmh >= 4.0 && kinematicSpm > 0) {
        // If sensor is wildly off from speed (> 30 SPM difference), gently pull towards expected kinematic range
        if (Math.abs(rawSensorSpm - kinematicSpm) > 28) {
          spm = Math.round(rawSensorSpm * 0.5 + kinematicSpm * 0.5);
        } else {
          spm = Math.round(rawSensorSpm * 0.8 + kinematicSpm * 0.2);
        }
      } else {
        spm = rawSensorSpm;
      }

      // Physiological realistic clamp: 120 to 200 SPM
      spm = Math.min(200, Math.max(120, spm));
    } else {
      // Use Kinematic Cadence from GPS Speed
      spm = kinematicSpm;
    }

    // Accumulate into active running samples only when moving (speed > 1.5 km/h or active SPM)
    if (spm >= 110 && (currentSpeedKmh > 1.5 || hasRecentSensorSteps)) {
      this.stepSamples.push(spm);
    }

    return {
      spm,
      totalSteps: this.totalSteps,
      isSensorActive: hasRecentSensorSteps
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
    this.gravityX = 0;
    this.gravityY = 0;
    this.gravityZ = 0;
    this.isGravityInitialized = false;
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
