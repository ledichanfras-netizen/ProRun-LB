import test from 'node:test';
import assert from 'node:assert/strict';
import { paceFromTotals, rollingPace, crossingSeconds } from '../utils/runCalculations';
import { MotionCadenceTracker } from '../utils/runningMetrics';

test('pace is seconds/km and rounds across a minute boundary', () => {
  assert.equal(paceFromTotals(1500, 5), '05:00');
  assert.equal(paceFromTotals(59.6, 1), '01:00');
  assert.equal(paceFromTotals(3000, 10), '05:00');
  for (const km of [0, -1, NaN, Infinity]) assert.equal(paceFromTotals(300, km), '--:--');
});
test('current rolling pace differs from overall pace after a speed change', () => {
  const samples = [{ seconds: 0, kilometers: 0 }, { seconds: 60, kilometers: 0.2 }, { seconds: 80, kilometers: 0.3 }];
  assert.equal(rollingPace(samples), '03:20');
  assert.equal(paceFromTotals(80, 0.3), '04:27');
  assert.equal(rollingPace([{ seconds: 0, kilometers: 0 }, { seconds: 20, kilometers: 0.001 }]), '--:--');
});
test('km crossing interpolates correctly instead of assigning full segment time', () => {
  assert.equal(crossingSeconds({ seconds: 270, kilometers: 0.9 }, { seconds: 330, kilometers: 1.1 }, 1), 300);
});
test('no sensor never produces an invented cadence even with a running GPS speed', () => {
  const tracker = new MotionCadenceTracker();
  assert.equal(tracker.getCadence(12).spm, 0);
  assert.equal(tracker.getAverageCadence(), 0);
});
test('detected phone contacts retain their observed frequency and read-only calls do not bias the average', async () => {
  let now = 10000;
  const originalNow = Date.now;
  const originalWindow = globalThis.window;
  Date.now = () => now;
  (globalThis as any).window = { addEventListener() {}, removeEventListener() {} };
  try {
    const tracker = new MotionCadenceTracker();
    await tracker.start();
    const motion = (z: number) => (tracker as any).handleMotion({ accelerationIncludingGravity: { x: 0, y: 0, z } });
    motion(9.81);
    for (let i = 0; i < 24; i++) { now += 300; motion(14.81); now += 33; motion(9.81); }
    const reading = tracker.sampleCadence();
    assert.ok(reading.spm >= 179 && reading.spm <= 181);
    const summary = tracker.getSummary();
    for (let i = 0; i < 100; i++) tracker.getCadence(5);
    assert.deepEqual(tracker.getSummary(), summary);
    tracker.stop();
    assert.equal(tracker.getCadence(12).spm, 0);
    const restored = new MotionCadenceTracker(); restored.restoreSummary(summary);
    assert.equal(restored.getAverageCadence(), tracker.getAverageCadence());
  } finally { Date.now = originalNow; (globalThis as any).window = originalWindow; }
});
