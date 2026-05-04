
/**
 * Centralized time utility to handle the simulated application time.
 * User requested "now" to be 2026-05-03 23:28.
 * Metadata says real "now" is around 2026-05-04 02:29.
 */

// We define the target "now" for the simulated app date.
// User says race was yesterday (May 3rd), so today is Monday May 4th.
export const APP_NOW = new Date('2026-05-04T00:15:00');

export function getAppNow() {
  // We use a fixed simulation start point to keep time moving forward relative to real time
  const simulationStartReal = new Date('2026-05-04T03:15:00').getTime();
  const simulationStartApp = APP_NOW.getTime();
  const realNow = Date.now();
  
  const elapsed = realNow - simulationStartReal;
  return new Date(simulationStartApp + elapsed);
}

export function formatAppDate(date: Date): string {
  return date.toLocaleDateString('pt-BR');
}

export function formatAppDateTime(date: Date): string {
  return date.toLocaleString('pt-BR');
}
