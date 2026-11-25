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
