import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RouteData, formatDuration, formatPace } from '../utils/gpsUtils';
import { WorkoutMap } from './WorkoutMap';

export function WorkoutCompletionReview({ route, onConfirm, onBack }: {
  route: RouteData; onConfirm: (reviewed: RouteData) => Promise<void>; onBack: () => void;
}) {
  const [rpe, setRpe] = useState(route.completion ? String(route.completion.rpe) : '');
  const [observations, setObservations] = useState(route.completion?.observations || '');
  const [distance, setDistance] = useState(String(route.totalDistanceKm || ''));
  const [time, setTime] = useState(route.totalDurationSeconds > 0 ? `${Math.floor(route.totalDurationSeconds / 60)}:${String(Math.round(route.totalDurationSeconds) % 60).padStart(2, '0')}` : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const km = route.totalDistanceKm > 0 ? route.totalDistanceKm : Number(distance.replace(',', '.'));
  const seconds = route.totalDurationSeconds > 0 ? route.totalDurationSeconds : (/^\d+:[0-5]\d$/.test(time) ? Number(time.split(':')[0]) * 60 + Number(time.split(':')[1]) : 0);
  const value = (number: number | undefined, unit: string, decimals = 0) => number !== undefined && Number.isFinite(number) ? `${number.toFixed(decimals)} ${unit}` : 'Não informado';
  const metrics: [string, string][] = [
    ['Distância', value(km > 0 ? km : undefined, 'km', 2)], [route.source === 'gpx_file' ? 'Tempo registrado (GPX)' : 'Tempo ativo', seconds > 0 ? formatDuration(seconds) : 'Não informado'],
    ['Pace geral', `${formatPace(seconds, km)} /km`], ['Velocidade média', value(seconds > 0 && km > 0 ? km * 3600 / seconds : undefined, 'km/h', 1)],
    ['Cadência média', value(route.avgCadence, 'passadas/min')], ['Cadência máxima', value(route.maxCadence, 'passadas/min')],
    ['FC média', value(route.avgHeartRate, 'bpm')], ['FC máxima', value(route.maxHeartRate, 'bpm')],
    ['Calorias estimadas', value(route.calories, 'kcal')], ['Ganho de elevação', value(route.elevationGainMeters, 'm')],
    ['Perda de elevação', value(route.elevationLossMeters, 'm')], ['Velocidade máxima GPS', value(route.maxSpeedKmh, 'km/h', 1)]
  ];
  const submit = async () => {
    if (lock.current) return;
    if (rpe === '' || !Number.isInteger(Number(rpe)) || Number(rpe) < 0 || Number(rpe) > 10) { setError('Preencha a PSE de 0 a 10.'); return; }
    if (!Number.isFinite(km) || km <= 0 || seconds <= 0) { setError('Preencha a distância e o tempo real do treino.'); return; }
    lock.current = true; setSaving(true); setError('');
    try {
      await onConfirm({ ...route, totalDistanceKm: km, totalDurationSeconds: seconds, avgPace: formatPace(seconds, km), completion: { rpe: Number(rpe), observations: observations.trim() } });
    } catch { setError('Não foi possível salvar. Seus dados foram mantidos. Verifique a conexão e tente novamente.'); }
    finally { lock.current = false; setSaving(false); }
  };
  return createPortal(<div role="dialog" aria-modal="true" aria-labelledby="completion-title" className="fixed inset-0 z-[20000] overflow-y-auto bg-slate-950 p-4 sm:p-6">
    <div className="max-w-lg mx-auto space-y-5 pb-8 text-slate-200">
      <button type="button" disabled={saving} onClick={onBack} className="text-[10px] font-black uppercase italic tracking-widest p-2 text-slate-300">Voltar</button>
      <div><h2 id="completion-title" className="text-xl font-black uppercase italic tracking-tight text-white">Salvar treino</h2>
        <p className="text-xs text-slate-400 mt-2">Confira as métricas, preencha sua PSE e registre como foi a corrida.</p></div>
      <div className="grid grid-cols-2 gap-3">{metrics.map(([label, metric]) => <div key={label} className="rounded-2xl bg-white/5 border border-white/10 p-3">
        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">{label}</span>
        <strong className="text-sm font-black text-white">{metric}</strong>
      </div>)}</div>
      <p className="text-[10px] text-slate-400">{route.cadenceSource === 'phone_accelerometer' ? 'Cadência estimada pelo acelerômetro do celular.' : route.cadenceSource === 'gpx' ? 'Cadência importada; unidade conforme o arquivo GPX.' : 'Cadência não disponível: nenhum dado de passadas foi registrado.'} Pace atual é o ritmo recente; pace geral usa tempo ÷ distância. No GPS ao vivo, as pausas manuais são excluídas. Calorias e elevação são estimativas.</p>
      {!(route.totalDistanceKm > 0) && <label className="block text-xs font-bold text-slate-300">Distância real (km)<input aria-label="Distância real (km)" className="pro-input block w-full mt-2" inputMode="decimal" value={distance} onChange={e => setDistance(e.target.value)} /></label>}
      {!(route.totalDurationSeconds > 0) && <label className="block text-xs font-bold text-slate-300">Tempo real (minutos:segundos)<input aria-label="Tempo real (minutos:segundos)" className="pro-input block w-full mt-2" placeholder="30:00" value={time} onChange={e => setTime(e.target.value)} /></label>}
      {!!route.points?.length && <WorkoutMap points={route.points} height="180px" />}
      {!!route.kmSplits?.length && <details><summary className="pro-label cursor-pointer">Parciais da corrida</summary><div className="space-y-2">{route.kmSplits.map((split, index) => <p key={index} className="text-xs text-slate-300">Parcial {index + 1} · {split.pace}/km · {formatDuration(split.durationSeconds)}</p>)}</div></details>}
      <label className="block text-xs font-black uppercase italic tracking-wide text-slate-300">PSE (0–10)<input aria-label="PSE (0–10)" type="number" min="0" max="10" step="1" inputMode="numeric" required value={rpe} onChange={e => { setRpe(e.target.value); setError(''); }} className="pro-input block w-full mt-2" placeholder="Como foi o esforço?" /></label>
      <label className="block text-xs font-black uppercase italic tracking-wide text-slate-300">Observações<textarea aria-label="Observações" value={observations} onChange={e => { setObservations(e.target.value); setError(''); }} className="pro-input block w-full mt-2 min-h-24" placeholder="Como você se sentiu? Dor, cansaço, clima ou outros detalhes." maxLength={3000} /></label>
      {error && <p role="alert" className="text-red-400 text-sm font-semibold">{error}</p>}
      <button type="button" disabled={saving} onClick={submit} className="w-full rounded-2xl bg-emerald-700 text-white px-5 py-4 text-xs font-black uppercase italic tracking-widest disabled:opacity-50">{saving ? 'Salvando…' : 'Postar treino'}</button>
      <p className="text-center text-[10px] text-slate-400">Salva o treino e abre a tela para criar sua postagem.</p>
    </div>
  </div>, document.body);
}
