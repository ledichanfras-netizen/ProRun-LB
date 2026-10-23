/**
 * Pro Running Metrics & Telemetry Utilities
 * - Phone accelerometer cadence estimate in foot contacts/minute
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
  cadenceSpm: number | null;
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
 * Estimates foot contacts from phone accelerometer impacts. No cadence is invented from GPS speed.
 */
export class MotionCadenceTracker {
  private stepTimestamps: number[] = [];
  private totalSteps: number = 0;
  private lastStepTime: number = 0;
  private isListening: boolean = false;
  private onMotionBound: ((event: DeviceMotionEvent) => void) | null = null;
  private stepSamples: number[] = [];
  private lastSampleTime = 0;
  private previousMagnitude = 0;

  // Low-pass / gravity filter states
  private gravityX: number = 0;
  private gravityY: number = 0;
  private gravityZ: number = 0;
  private isGravityInitialized: boolean = false;

  public async start(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (this.isListening) return true;

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
    this.stepTimestamps = [];
    this.lastStepTime = 0;
    this.isGravityInitialized = false;
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
    const gravityLength = Math.hypot(this.gravityX, this.gravityY, this.gravityZ);
    const dynamicMagnitude = gravityLength > 1
      ? (dynX * this.gravityX + dynY * this.gravityY + dynZ * this.gravityZ) / gravityLength
      : dynZ;
    const crossedThreshold = dynamicMagnitude > 1.2 && this.previousMagnitude <= 1.2;
    this.previousMagnitude = dynamicMagnitude;
    // One upward crossing per impact; 250 ms avoids counting the same rebound twice.
    if (crossedThreshold && now - this.lastStepTime > 250) {
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

  /** Current detected phone cadence. GPS speed never supplies a missing step rate. */
  public getCadence(currentSpeedKmh: number = 0): { spm: number; totalSteps: number; isSensorActive: boolean } {
    const now = Date.now();
    const cutoff = now - 10000;
    while (this.stepTimestamps.length > 0 && this.stepTimestamps[0] < cutoff) {
      this.stepTimestamps.shift();
    }

    const hasRecentSensorSteps = this.isListening && this.stepTimestamps.length >= 3 && now - this.lastStepTime < 2000;
    let spm = 0;
    if (hasRecentSensorSteps) {
      const span = this.stepTimestamps[this.stepTimestamps.length - 1] - this.stepTimestamps[0];
      const measured = span > 0 ? Math.round(60000 * (this.stepTimestamps.length - 1) / span) : 0;
      if (measured >= 40 && measured <= 240) spm = measured;
    }
    return {
      spm,
      totalSteps: this.totalSteps,
      isSensorActive: hasRecentSensorSteps && spm > 0
    };
  }

  public sampleCadence(): ReturnType<MotionCadenceTracker['getCadence']> {
    const result = this.getCadence();
    const now = Date.now();
    if (result.spm > 0 && now - this.lastSampleTime >= 900) {
      this.stepSamples.push(result.spm);
      this.lastSampleTime = now;
    }
    return result;
  }

  public getSummary(): { sum: number; count: number } {
    return { sum: this.stepSamples.reduce((a, b) => a + b, 0), count: this.stepSamples.length };
  }
  public restoreSummary(summary?: { sum: number; count: number }): void {
    this.stepSamples = summary && summary.count > 0 && Number.isFinite(summary.sum)
      ? Array(Math.min(86400, summary.count)).fill(summary.sum / summary.count) : [];
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
    this.lastSampleTime = 0;
    this.previousMagnitude = 0;
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

/** Retain actual cardiac extrema and signal gaps instead of a uniform 75-point trace. */
export function compactWorkoutTelemetry(samples: TelemetryPoint[], maxCardiacPoints = 1200): TelemetryPoint[] {
  if (!samples.some(point=>Number.isFinite(point.heartRate)&&point.heartRate!>0)) return downsampleTelemetry(samples,75);
  if(samples.length<=maxCardiacPoints) return samples;
  const count=Math.max(2,Math.floor(maxCardiacPoints));
  if(count<5)return downsampleTelemetry(samples,count);
  const indexes=new Set<number>([0,samples.length-1]);
  const buckets=Math.max(1,Math.floor((count-2)/3));
  for(let bucket=0;bucket<buckets;bucket++) {
    const start=1+Math.floor(bucket*(samples.length-2)/buckets),end=1+Math.floor((bucket+1)*(samples.length-2)/buckets);
    let low=-1,high=-1,gap=-1;
    for(let index=start;index<end;index++) {
      const bpm=samples[index].heartRate;
      if(!Number.isFinite(bpm)||!(bpm!>0)){if(gap<0)gap=index;continue;}
      if(low<0||bpm!<samples[low].heartRate!)low=index;
      if(high<0||bpm!>samples[high].heartRate!)high=index;
    }
    for(const index of [low,high,gap])if(index>=0)indexes.add(index);
  }
  return [...indexes].sort((a,b)=>a-b).map(index=>samples[index]);
}

/** Time-based sampling works through GPS dropouts and stationary recoveries. */
export function appendTimedTelemetry(samples: TelemetryPoint[], point: TelemetryPoint, force=false): boolean {
  const last=samples[samples.length-1];
  if(last && point.durationSeconds<last.durationSeconds)return false;
  if(last && point.durationSeconds===last.durationSeconds){samples[samples.length-1]=point;return true;}
  if(!force&&last&&point.durationSeconds-last.durationSeconds<2)return false;
  samples.push(point);return true;
}
