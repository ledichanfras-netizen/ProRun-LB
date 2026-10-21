import type { Athlete, AthletePlan } from '../types';
import { activityDistance, getTrainingActivities, weekStart } from './trainingActivities';
import { getLocalDateString, parseDateString } from './time';
import { calculateATL_CTL_TSB, parseWorkoutDurationToMinutes } from './stressModel';

export function buildCoachOverview(athlete: Athlete, plan: AthletePlan | undefined, today: string) {
  const shift = (days: number) => { const date = parseDateString(today); date.setDate(date.getDate() + days); return getLocalDateString(date); };
  const records = new Map<string, NonNullable<Athlete['lastReadiness']>>();
  if (athlete.lastReadiness) records.set(athlete.lastReadiness.date, athlete.lastReadiness);
  // The dated history is authoritative when a legacy lastReadiness disagrees.
  for (const entry of athlete.readinessHistory || []) records.set(entry.date, entry);
  const history = [...records.values()].filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.date <= today).sort((a,b) => b.date.localeCompare(a.date));
  const validScore = (r: NonNullable<Athlete['lastReadiness']>) => Number.isFinite(r.readinessScore) && r.readinessScore >= 0 && r.readinessScore <= 100;
  const current = history.find(r => r.date === today);
  const score = current && validScore(current) ? Math.round(current.readinessScore) : null;
  const previous = history.filter(r => r.date < today && r.date >= shift(-7) && validScore(r));
  const baseline = previous.length ? previous.reduce((sum,r)=>sum+r.readinessScore,0)/previous.length : null;
  const activities = getTrainingActivities(plan);
  const recorded = activities.filter(a=>a.completed && a.type !== 'Descanso' && a.date <= today);
  const published = activities.filter(a=>!a.isFreeRun && a.visible && a.type !== 'Descanso');
  const start = weekStart(today);
  const scheduledToday = published.filter(a=>a.date === today);
  const sessionsToday = recorded.filter(a=>a.date === today);
  const week = recorded.filter(a=>weekStart(a.date) === start);
  const extras = week.filter(a=>a.isFreeRun);
  const rpePresent = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10;
  const duration = (a: typeof recorded[number]) => parseWorkoutDurationToMinutes(a.actualDuration) || (a.gpsRoute?.totalDurationSeconds || 0)/60;
  const measured = (a: typeof recorded[number]) => rpePresent(a.rpe) && duration(a)>0;
  const recent = recorded.filter(a=>a.date>=shift(-6));
  const before = recorded.filter(a=>a.date>=shift(-13) && a.date<shift(-6));
  const load = (list: typeof recorded) => list.filter(measured).reduce((sum,a)=>sum+duration(a)*a.rpe!,0);
  const recentLoad = load(recent), previousLoad = load(before);
  const latest = [...recorded].sort((a,b)=>b.date.localeCompare(a.date) || ((b as {startTime?:string}).startTime || '').localeCompare((a as {startTime?:string}).startTime || ''))[0];
  const reasons: {text:string; date:string; urgent:boolean}[] = [];
  if (current) {
    if(score !== null && score<50) reasons.push({text:`Prontidão ${score}/100`,date:today,urgent:false});
    if(score !== null && baseline !== null && baseline-score>=15) reasons.push({text:`Queda de ${Math.round(baseline-score)} pontos frente às respostas dos últimos 7 dias`,date:today,urgent:false});
    if(current.sorenessScore>=4) reasons.push({text:`Desconforto ${current.sorenessScore}/10${current.sorenessLocation && current.sorenessLocation !== 'none' ? ` · ${current.sorenessLocation}` : ''}`,date:today,urgent:current.sorenessScore>=8});
    if(current.sleepScore<=3) reasons.push({text:`Sono ${current.sleepScore}/10`,date:today,urgent:false});
    if(current.stressScore>=7) reasons.push({text:`Estresse ${current.stressScore}/10`,date:today,urgent:false});
    if(athlete.gender==='female' && current.menstrualPhase!=='prefer-not' && current.menstrualSymptoms?.some(s=>s!=='Nenhum')) reasons.push({text:`Sintomas do ciclo relatados${current.menstrualIntensity ? ` · ${current.menstrualIntensity==='severe'?'intensos':current.menstrualIntensity==='moderate'?'moderados':'leves'}`:''}`,date:today,urgent:false});
  }
  if(latest && latest.date>=shift(-2) && rpePresent(latest.rpe) && latest.rpe>=8) reasons.push({text:`Último treino com PSE ${latest.rpe}/10`,date:latest.date,urgent:false});
  const fatigueTimeline = plan ? calculateATL_CTL_TSB(plan.weeks || [], athlete.metrics?.vdot || 40, plan.startDate, plan.freeRuns || [], parseDateString(today)).filter(day=>day.date<=today) : [];
  const fatigue = fatigueTimeline.length && recorded.length ? fatigueTimeline[fatigueTimeline.length-1].atl : null;
  const previousFatigue = fatigueTimeline.length>1 ? fatigueTimeline[fatigueTimeline.length-2].atl : null;
  const fatigueDirection = fatigue===null || previousFatigue===null ? null : Math.abs(fatigue-previousFatigue)<0.1 ? 'estável' : fatigue>previousFatigue ? 'em alta' : 'em queda';
  const unpublished = activities.some(a=>!a.isFreeRun && !a.visible && a.type!=='Descanso' && weekStart(a.date)===start);
  const hasPublishedWeek = activities.some(a=>!a.isFreeRun && a.visible && weekStart(a.date)===start);
  return {athlete,current,score,lastReadiness:history[0],reasons,scheduledToday,sessionsToday,latest,
    completedKm:week.reduce((sum,a)=>sum+activityDistance(a),0),plannedKm:published.filter(a=>weekStart(a.date)===start).reduce((sum,a)=>sum+(Number(a.distance)||0),0),
    fatigue,fatigueDirection,extras:extras.length,extraKm:extras.reduce((sum,a)=>sum+activityDistance(a),0),recentLoad,previousLoad,
    loadIncomplete:recent.some(a=>!measured(a)),loadChange:previousLoad>0 && !recent.some(a=>!measured(a)) && !before.some(a=>!measured(a)) ? Math.round((recentLoad/previousLoad-1)*100):null,
    missingRpe:week.filter(a=>!rpePresent(a.rpe)).length,
    unpublished,hasPublishedWeek,unregistered:scheduledToday.filter(a=>!a.completed).length};
}
export type CoachOverviewRow = ReturnType<typeof buildCoachOverview>;
