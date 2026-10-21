/** Round for display only; keep recorded GPS precision for calculations. */
export function formatDistance(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—';
  const km = Number(String(value).replace(',', '.'));
  return Number.isFinite(km) ? km.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '—';
}
