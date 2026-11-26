import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIntervalMetricsReport,
  calculateSpeedKmh,
  resolveIntervalMetricsForWorkout,
  type RawCompletedStep,
} from '../utils/intervalMetrics';
import { parseWorkoutTextToStructure } from '../utils/workoutParser';

test('parseWorkoutTextToStructure parses 8x200m com recuperação de 200m and 8x400m recuperação 200m accurately', () => {
  const s1 = parseWorkoutTextToStructure('8x200m com recuperação de 200m', 'Intervalado');
  assert.ok(s1);
  const ints1 = s1.steps.filter((s) => s.type === 'interval');
  const recs1 = s1.steps.filter((s) => s.type === 'recovery');
  assert.equal(ints1.length, 8);
  assert.equal(recs1.length, 8);
  assert.equal(ints1[0].targetType, 'distance');
  assert.equal(ints1[0].targetValue, 200);
  assert.equal(recs1[0].targetType, 'distance');
  assert.equal(recs1[0].targetValue, 200);

  const s2 = parseWorkoutTextToStructure('8x400m recuperação 200m', 'Intervalado');
  assert.ok(s2);
  assert.equal(s2.steps.find((s) => s.type === 'interval')?.targetValue, 400);
  assert.equal(s2.steps.find((s) => s.type === 'recovery')?.targetValue, 200);
});

test('buildIntervalMetricsReport computes per-rep and summary time, pace, and speed with and without recovery while excluding warmup/cooldown', () => {
  const steps: RawCompletedStep[] = [
    {
      stepId: 'warm',
      name: 'Aquecimento',
      type: 'warmup',
      completedDistanceMeters: 1500,
      completedDurationSeconds: 540,
    },
  ];

  // 8x 200m in 40s (03:20/km, 18.0 km/h) except #4 in 36s (03:00/km, 20.0 km/h),
  // with 200m recovery in 80s (06:40/km, 9.0 km/h)
  for (let i = 1; i <= 8; i++) {
    const tiroSec = i === 4 ? 36 : 40;
    steps.push({
      stepId: `int-${i}`,
      name: `Tiro ${i}/8`,
      type: 'interval',
      completedDistanceMeters: 200,
      completedDurationSeconds: tiroSec,
    });
    steps.push({
      stepId: `rec-${i}`,
      name: `Recuperação ${i}/8`,
      type: 'recovery',
      completedDistanceMeters: 200,
      completedDurationSeconds: 80,
    });
  }

  steps.push({
    stepId: 'cool',
    name: 'Desaquecimento',
    type: 'cooldown',
    completedDistanceMeters: 1000,
    completedDurationSeconds: 380,
  });

  const report = buildIntervalMetricsReport(steps, 'recorded_steps');
  assert.ok(report);
  assert.equal(report.hasIntervals, true);
  assert.equal(report.hasRecoveries, true);
  assert.equal(report.intervals.length, 8);
  assert.equal(report.recoveries.length, 8);
  assert.equal(report.pairs.length, 8);

  // Per-rep metrics
  assert.equal(report.intervals[0].durationSeconds, 40);
  assert.equal(report.intervals[0].pace, '03:20');
  assert.equal(report.intervals[0].avgSpeedKmh, 18.0);
  assert.equal(report.intervals[3].durationSeconds, 36);
  assert.equal(report.intervals[3].pace, '03:00');
  assert.equal(report.intervals[3].avgSpeedKmh, 20.0);

  assert.equal(report.recoveries[0].durationSeconds, 80);
  assert.equal(report.recoveries[0].pace, '06:40');
  assert.equal(report.recoveries[0].avgSpeedKmh, 9.0);

  // Sem recuperação (only 8x200m = 1600m, 7*40 + 36 = 316s)
  assert.equal(report.withoutRecovery.totalDistanceMeters, 1600);
  assert.equal(report.withoutRecovery.totalDurationSeconds, 316);
  assert.equal(report.withoutRecovery.avgPace, '03:18');
  assert.equal(report.withoutRecovery.avgSpeedKmh, calculateSpeedKmh(1600, 316));
  assert.equal(report.withoutRecovery.fastestRepNumber, 4);
  assert.equal(report.withoutRecovery.fastestPace, '03:00');
  assert.equal(report.withoutRecovery.fastestSpeedKmh, 20.0);

  // Com recuperação (1600m + 1600m = 3200m, 316s + 640s = 956s)
  assert.equal(report.withRecovery.totalDistanceMeters, 3200);
  assert.equal(report.withRecovery.totalDurationSeconds, 956);
  assert.equal(report.withRecovery.avgPace, '04:59');
  assert.equal(report.withRecovery.avgSpeedKmh, calculateSpeedKmh(3200, 956));

  // Somente recuperações
  assert.equal(report.recoveryOnly.totalDistanceMeters, 1600);
  assert.equal(report.recoveryOnly.totalDurationSeconds, 640);
  assert.equal(report.recoveryOnly.avgPace, '06:40');
  assert.equal(report.recoveryOnly.avgSpeedKmh, 9.0);

  // Warmup/cooldown excluded from interval summaries, preserved separately
  assert.equal(report.warmups.length, 1);
  assert.equal(report.cooldowns.length, 1);
});

test('resolveIntervalMetricsForWorkout segments recorded telemetrySamples when completedSteps is absent', () => {
  // Simulate a 3.2km telemetry stream for 8x200m + 8x200m recovery (40s tiro + 80s recovery per pair)
  const telemetrySamples = [];
  let t = 0;
  let distKm = 0;
  for (let i = 1; i <= 8; i++) {
    t += 40;
    distKm += 0.2;
    telemetrySamples.push({
      distanceKm: Number(distKm.toFixed(4)),
      durationSeconds: t,
      paceSeconds: 200,
      paceFormatted: '03:20',
      cadenceSpm: null,
      calories: 10 * i,
    });
    t += 80;
    distKm += 0.2;
    telemetrySamples.push({
      distanceKm: Number(distKm.toFixed(4)),
      durationSeconds: t,
      paceSeconds: 400,
      paceFormatted: '06:40',
      cadenceSpm: null,
      calories: 15 * i,
    });
  }

  const report = resolveIntervalMetricsForWorkout(
    {
      totalDistanceKm: 3.2,
      totalDurationSeconds: 960,
      telemetrySamples,
    },
    null,
    '8x200m com recuperação de 200m',
    'Intervalado'
  );

  assert.ok(report);
  assert.equal(report.source, 'telemetry_segmented');
  assert.equal(report.intervals.length, 8);
  assert.equal(report.recoveries.length, 8);
  assert.equal(report.withoutRecovery.avgPace, '03:20');
  assert.equal(report.withoutRecovery.avgSpeedKmh, 18.0);
  assert.equal(report.recoveryOnly.avgPace, '06:40');
  assert.equal(report.recoveryOnly.avgSpeedKmh, 9.0);
  assert.equal(report.withRecovery.avgPace, '05:00');
  assert.equal(report.withRecovery.avgSpeedKmh, 12.0);
});

test('resolveIntervalMetricsForWorkout enriches and summarizes per-step heart rate, cadence, calories, and cumulative time', () => {
  const completedSteps: RawCompletedStep[] = [
    {
      stepId: 'warm',
      name: 'Aquecimento',
      type: 'warmup',
      completedDistanceMeters: 1000,
      completedDurationSeconds: 360,
    },
    {
      stepId: 'int-1',
      name: 'Tiro 1/2',
      type: 'interval',
      completedDistanceMeters: 200,
      completedDurationSeconds: 40,
    },
    {
      stepId: 'rec-1',
      name: 'Recuperação 1/2',
      type: 'recovery',
      completedDistanceMeters: 200,
      completedDurationSeconds: 80,
    },
    {
      stepId: 'int-2',
      name: 'Tiro 2/2',
      type: 'interval',
      completedDistanceMeters: 200,
      completedDurationSeconds: 38,
      avgHeartRate: 180,
      maxHeartRate: 186,
      avgCadence: 192,
      calories: 16,
      splitTimeSeconds: 518,
    },
  ];

  // Telemetry samples covering warmup [0..360], tiro 1 [360..400], rec 1 [400..480]
  const telemetrySamples = [
    { distanceKm: 0.5, durationSeconds: 180, heartRate: 132, cadenceSpm: 164, calories: 35 },
    { distanceKm: 1.0, durationSeconds: 360, heartRate: 138, cadenceSpm: 166, calories: 70 },
    { distanceKm: 1.1, durationSeconds: 380, heartRate: 168, cadenceSpm: 186, calories: 78 },
    { distanceKm: 1.2, durationSeconds: 400, heartRate: 174, cadenceSpm: 190, calories: 85 },
    { distanceKm: 1.3, durationSeconds: 440, heartRate: 148, cadenceSpm: 158, calories: 92 },
    { distanceKm: 1.4, durationSeconds: 480, heartRate: 140, cadenceSpm: 156, calories: 99 },
  ];

  const report = resolveIntervalMetricsForWorkout({ completedSteps, telemetrySamples });
  assert.ok(report);
  assert.equal(report.source, 'recorded_steps');
  assert.equal(report.intervals[0].splitTimeSeconds, 400);
  assert.equal(report.intervals[0].avgHeartRate, 160); // [360..400]: 138, 168, 174 -> avg 160
  assert.equal(report.intervals[0].maxHeartRate, 174);
  assert.equal(report.intervals[0].avgCadence, 181); // 166, 186, 190 -> 181
  assert.equal(report.intervals[0].calories, 15); // 85 - 70

  assert.equal(report.intervals[1].avgHeartRate, 180);
  assert.equal(report.intervals[1].maxHeartRate, 186);
  assert.equal(report.intervals[1].splitTimeSeconds, 518);

  assert.equal(report.recoveries[0].splitTimeSeconds, 480);
  assert.equal(report.recoveries[0].avgHeartRate, 154); // [400..480]: 174, 148, 140 -> 154
  assert.equal(report.withoutRecovery.maxHeartRate, 186);
  assert.ok(report.withoutRecovery.avgHeartRate && report.withoutRecovery.avgHeartRate >= 169);
  assert.ok(report.withRecovery.avgHeartRate && report.withRecovery.avgHeartRate < report.withoutRecovery.avgHeartRate!);
  assert.equal(report.withoutRecovery.totalCalories, 31);
});
