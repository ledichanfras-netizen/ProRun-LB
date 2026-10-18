import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play } from 'lucide-react';
import { Athlete, FreeRun } from '../types';
import { useApp } from '../contexts/AppContext';
import { GpsWorkoutTracker } from './GpsWorkoutTracker';
import { WorkoutShareModal, WorkoutShareData } from './WorkoutShareModal';
import { RouteData, formatPace } from '../utils/gpsUtils';
import { WorkoutMap } from './WorkoutMap';
import { normalizeGpsPoints } from '../utils/socialCardUtils';
import { activityDistance, getTrainingActivities, weekStart } from '../utils/trainingActivities';
import { calculateWorkoutTRIMP } from '../utils/stressModel';
import { getAppNow, getTodayDateString } from '../utils/time';
import { clearActiveWorkoutBackup, clearUnsavedRouteBackup, getActiveWorkoutBackup, getUnsavedRouteBackup } from '../utils/gpsUtils';

export const FreeRunPanel = ({ athlete, compact = false }: { athlete: Athlete; compact?: boolean }) => {
  const { athletePlans, saveFreeRun } = useApp();
  const [mode, setMode] = useState<'gps' | 'manual' | null>(null);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [rpe, setRpe] = useState('');
  const [observations, setObservations] = useState('');
  const [shareData, setShareData] = useState<WorkoutShareData | null>(null);
  const [route, setRoute] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selected, setSelected] = useState<FreeRun | null>(null);
  const [resume, setResume] = useState(false);
  const runId = useRef('');
  const saveLock = useRef(false);
  const plan = athletePlans[athlete.id];
  const runs = plan?.freeRuns || [];
  const today = getTodayDateString();
  const activities = getTrainingActivities(plan).filter(run => run.completed && run.type !== 'Descanso');
  const dailyActivities = activities.filter(run => run.date === today);
  const weeklyActivities = activities.filter(run => weekStart(run.date) === weekStart(today));
  const hasWeeklyFreeRun = weeklyActivities.some(run => run.isFreeRun);
  const freeToday = dailyActivities.some(run => run.isFreeRun);
  const dailyKm = dailyActivities.reduce((sum, run) => sum + activityDistance(run), 0);
  const weeklyKm = weeklyActivities.reduce((sum, run) => sum + activityDistance(run), 0);
  const dailyLoad = dailyActivities.reduce((sum, run) => sum + calculateWorkoutTRIMP(run, athlete.metrics.vdot), 0);
  const activeBackup = getActiveWorkoutBackup();
  const unsavedBackup = getUnsavedRouteBackup();
  const recoverable = activeBackup?.weekIndex === -1 || unsavedBackup?.workoutContext?.weekIndex === -1;

  const open = (next: 'gps' | 'manual') => {
    if (getActiveWorkoutBackup() && !recoverable) {
      setError('Conclua ou descarte a corrida em andamento antes de iniciar outra.');
      return;
    }
    runId.current = crypto.randomUUID();
    setDistance(''); setDuration(''); setRpe(''); setObservations(''); setRoute(null);
    setError(''); setSuccess(false); setResume(false); setMode(next);
  };

  const capture = (captured: any) => {
    setRoute(captured);
    setDistance(String(captured.totalDistanceKm || 0));
    const seconds = Math.round(captured.totalDurationSeconds || captured.durationSeconds || 0);
    setDuration(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
    setMode('manual');
  };

  const save = async (post = false) => {
    if (saveLock.current) return;
    const km = Number(distance.replace(',', '.'));
    const parts = duration.split(':').map(Number);
    const seconds = parts.length === 2 ? parts[0] * 60 + parts[1] : NaN;
    const effort = rpe === '' ? undefined : Number(rpe);
    if (rpe === '' || !Number.isFinite(km) || km <= 0 || !/^\d+:[0-5]\d$/.test(duration) || seconds <= 0 ||
        (effort !== undefined && (!Number.isInteger(effort) || effort < 0 || effort > 10))) {
      setError('Informe distância maior que zero, tempo em minutos:segundos (ex.: 30:00) e PSE de 0 a 10.');
      return;
    }
    saveLock.current = true; setSaving(true); setError('');
    try {
      await saveFreeRun(athlete.id, {
        id: runId.current || (runId.current = crypto.randomUUID()),
        day: getAppNow().toLocaleDateString('pt-BR', { weekday: 'long' }),
        date: getTodayDateString(), type: 'Rodagem', customDescription: 'Corrida livre',
        completed: true, actualDistance: km, actualDuration: duration, rpe: effort, feedback: observations.trim(),
        ...(route ? { gpsRoute: { ...route, totalDistanceKm: km, totalDurationSeconds: seconds }, avgHeartRate: route.avgHeartRate } : {})
      });
      if (recoverable || route) { clearActiveWorkoutBackup(); clearUnsavedRouteBackup(); }
      if (post) setShareData({ title: 'Corrida livre', athleteName: athlete.name, date: getTodayDateString(), distanceKm: km, durationSeconds: seconds, avgPace: formatPace(seconds, km), rpe: effort, route });
      setMode(null); setSuccess(true); setRoute(null);
    } catch {
      setError('Não foi possível salvar. Seus dados continuam aqui; verifique a conexão e tente novamente.');
    } finally { saveLock.current = false; setSaving(false); }
  };

  const saveCapturedWorkout = async (captured: RouteData) => {
    if (!captured.completion) { capture(captured); return; }
    const { rpe: effort, observations: notes } = captured.completion;
    const seconds = Math.round(captured.totalDurationSeconds);
    const duration = `${Math.floor(seconds / 60)}:${String(Math.round(seconds) % 60).padStart(2, '0')}`;
    await saveFreeRun(athlete.id, {
      id: runId.current || (runId.current = crypto.randomUUID()),
      day: getAppNow().toLocaleDateString('pt-BR', { weekday: 'long' }), date: getTodayDateString(),
      type: 'Rodagem', customDescription: 'Corrida livre', completed: true,
      actualDistance: captured.totalDistanceKm, actualDuration: duration, rpe: effort, feedback: notes,
      gpsRoute: captured as FreeRun['gpsRoute'], avgHeartRate: captured.avgHeartRate
    });
    clearActiveWorkoutBackup(); clearUnsavedRouteBackup(); setMode(null); setSuccess(true);
    setShareData({ title: 'Corrida livre', athleteName: athlete.name, date: getTodayDateString(),
      distanceKm: captured.totalDistanceKm, durationSeconds: seconds, avgPace: captured.avgPace,
      rpe: effort, route: captured, elevationGainMeters: captured.elevationGainMeters,
      calories: captured.calories, avgHeartRate: captured.avgHeartRate, initialBackgroundType: 'transparent' });
  };

  const recover = () => {
    runId.current ||= crypto.randomUUID(); setError(''); setSuccess(false);
    if (unsavedBackup?.workoutContext?.weekIndex === -1) { setResume(true); setMode('gps'); }
    else if (activeBackup?.weekIndex === -1) { setResume(true); setMode('gps'); }
  };

  const history = runs.length > 0 && <details className="space-y-2">
    <summary className="text-[10px] font-black uppercase italic tracking-widest text-slate-400 cursor-pointer">Histórico de corridas livres</summary>
    {[...runs].reverse().map(run => <button key={run.id} onClick={() => setSelected(run)} className="block w-full text-left rounded-xl bg-white/5 p-3 text-slate-200 text-xs font-semibold">
      {run.date?.split('-').reverse().join('/')} · {run.actualDistance} km · {run.actualDuration}
      {run.rpe !== undefined && ` · PSE ${run.rpe}`}
    </button>)}
  </details>;

  return (
    <section className={compact ? 'flex flex-col items-center gap-2' : 'glass-card p-5 space-y-4'}>
      {compact ? (
        <button type="button" onClick={() => recoverable ? recover() : open('gps')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/30 font-black uppercase italic tracking-widest text-[10px] transition-all active:scale-[0.98]">
          <Play className="w-3.5 h-3.5" /> Iniciar Corrida Livre
        </button>
      ) : <>

      <div><h2 className="text-lg font-black text-white">Corrida livre</h2>
        <p className="text-sm text-slate-400">Corra e registre sua atividade mesmo sem treino programado para hoje.</p></div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => open('gps')} className="bg-emerald-700 text-white rounded-xl p-3 font-bold">Correr com GPS</button>
        <button onClick={() => open('manual')} className="bg-slate-800 text-white rounded-xl p-3 font-bold">Registrar corrida</button>
      </div>
      {recoverable && <button className="text-amber-400 text-sm font-bold" onClick={recover}>Recuperar corrida livre pendente</button>}
      </>}
      {hasWeeklyFreeRun && <div data-free-run-summary className="w-full rounded-2xl p-4 bg-emerald-500/10 border border-emerald-500/20 text-slate-200 space-y-2">
        <p className="text-xs font-black uppercase italic text-emerald-400">{freeToday ? 'Corrida livre concluída hoje' : 'Corrida livre contabilizada na semana'}</p>
        <p className="text-sm font-bold">Hoje: {dailyActivities.length} treino(s) · {dailyKm.toFixed(2).replace('.', ',')} km</p>
        <p className="text-xs">Semana: {weeklyKm.toFixed(2).replace('.', ',')} km · Carga de hoje: {dailyLoad} UA</p>
        <p className="text-[10px] text-slate-400">Totais incluem os treinos prescritos e as corridas livres.</p>
      </div>}
      {success && <p role="status" className="text-emerald-400 text-sm">Corrida salva e contabilizada nos treinos e métricas.</p>}
      {!mode && error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
      {!compact && history}
      {mode && createPortal(<div className="fixed inset-0 z-[10001] bg-slate-950 overflow-y-auto p-4">
        <div className="max-w-lg mx-auto space-y-5">
          <button disabled={saving} className="text-slate-300 p-3" onClick={() => setMode(null)}>Fechar</button>
          {compact && <div className="space-y-3">
            <button type="button" disabled={saving} onClick={() => setMode(mode === 'gps' ? 'manual' : 'gps')}
              className="text-[10px] font-black uppercase italic tracking-widest text-emerald-400 hover:underline">
              {mode === 'gps' ? 'Registrar corrida manualmente' : 'Voltar ao GPS'}
            </button>
            {history}
          </div>}
          {mode === 'gps' ? <GpsWorkoutTracker workoutType="Corrida livre" athleteWeight={athlete.weight || 70}
            workoutContext={{ weekIndex: -1, dayIndex: -1 }} autoResumeBackup={resume}
            onRouteCaptured={saveCapturedWorkout} onCancel={() => setMode(null)} /> : <>
            <h2 className="text-xl font-black text-white">Registrar corrida livre</h2>
            <label className="block text-slate-300">Distância (km)<input aria-label="Distância (km)" className="pro-input block w-full mt-2" inputMode="decimal" value={distance} onChange={e => setDistance(e.target.value)} /></label>
            <label className="block text-slate-300">Tempo (minutos:segundos)<input aria-label="Tempo (minutos:segundos)" className="pro-input block w-full mt-2" placeholder="30:00" value={duration} onChange={e => setDuration(e.target.value)} /></label>
            <label className="block text-slate-300">PSE (0–10)<input aria-label="PSE" className="pro-input block w-full mt-2" type="number" min="0" max="10" value={rpe} onChange={e => setRpe(e.target.value)} /></label>
            <label className="block text-slate-300">Observações<textarea aria-label="Observações" className="pro-input block w-full mt-2" value={observations} onChange={e => setObservations(e.target.value)} maxLength={3000} /></label>
            {error && <p role="alert" className="text-red-400">{error}</p>}
            <button disabled={saving} onClick={() => save(true)} className="w-full bg-emerald-700 text-white rounded-xl p-4 font-bold disabled:opacity-50">{saving ? 'Salvando…' : 'Postar treino'}</button>
          </>}
        </div>
      </div>, document.body)}
      {shareData && <WorkoutShareModal data={shareData} onClose={() => setShareData(null)} />}
      {selected && createPortal(<div className="fixed inset-0 z-[10001] bg-slate-950 overflow-y-auto p-5">
        <div className="max-w-lg mx-auto space-y-4 text-slate-200">
          <button className="p-3" onClick={() => setSelected(null)}>Fechar</button>
          <h2 className="text-xl font-black">Corrida livre · {selected.date?.split('-').reverse().join('/')}</h2>
          <p>{selected.actualDistance} km · {selected.actualDuration}{selected.rpe !== undefined && ` · PSE ${selected.rpe}`}</p>
          {selected.gpsRoute && <WorkoutMap points={normalizeGpsPoints(selected.gpsRoute)} />}
        </div>
      </div>, document.body)}
    </section>
  );
};
