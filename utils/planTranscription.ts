import type {AthletePlan,TrainingWeek,WorkoutType,WorkoutStep} from '../types';
import {getLocalDateString,parseDateString,getWorkoutDateString} from './time.ts';
export const importTypes:WorkoutType[]=['Rodagem','Regenerativo','Longão','Limiar','Intervalado','Maratona','Descanso','Fortalecimento','Velocidade','Natação','Ciclismo','Transição','Prova'];
export const importDays=['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];
export interface ImportRow{id:string;week:number;dayIndex:number|null;date:string;type:WorkoutType;description:string;distanceKm:number|null;durationMinutes:number|null;steps:WorkoutStep[];issues:string[];}
export interface ImportCoverage{week:number;days:{dayIndex:number;status:'content'|'blank'|'not_shown'|'unreadable'}[];}
export interface PlanImportDraft{coverage?:ImportCoverage[];id:string;title:string;createdAt:string;sourceNames:string[];warnings:string[];rows:ImportRow[];}
export const validImportDate=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&getLocalDateString(parseDateString(date))===date;
const text=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
const amount=(v:unknown,max:number)=>v===null||v===undefined||v===''?null:typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max?v:null;
export function normalizeImport(raw:any,sourceNames:string[],id:string):PlanImportDraft{
 if(!raw||!Array.isArray(raw.rows)||!raw.rows.length||raw.rows.length>100)throw new Error('Não foi possível identificar até 100 treinos. Envie uma planilha menor e legível.');
 const warnings=(Array.isArray(raw.warnings)?raw.warnings:[]).slice(0,30).map((v:any)=>text(v,300)).filter(Boolean);
 const rows=raw.rows.map((r:any,i:number):ImportRow=>{
  const issues:string[]=(Array.isArray(r?.issues)?r.issues:[]).slice(0,15).map((v:any)=>text(v,300)).filter(Boolean);
  const description=text(r?.description,5000);if(typeof r?.description==='string'&&r.description.length>5000)issues.push('Descrição longa: a transcrição foi limitada. Confira o documento antes de adicionar ao ciclo.');if(!description)issues.push('Descrição não identificada: confira o documento.');
  const date=validImportDate(r?.date||'')?r.date:'';if(!date)issues.push('Confirme a data deste treino.');
  const type=importTypes.includes(r?.type)?r.type:'Rodagem';if(!importTypes.includes(r?.type))issues.push('Confira o tipo de treino.');
  const distanceKm=amount(r?.distanceKm,500),durationMinutes=amount(r?.durationMinutes,1440);
  if(r?.distanceKm!=null&&distanceKm===null)issues.push('Distância inválida: informe novamente.');
  if(r?.durationMinutes!=null&&durationMinutes===null)issues.push('Duração inválida: informe novamente.');
  const steps:WorkoutStep[]=[];
  for(const [n,s]of (Array.isArray(r?.steps)?r.steps:[]).slice(0,200).entries()){
   if(!['warmup','interval','recovery','cooldown','steady'].includes(s?.type)||!['distance','time'].includes(s?.targetType)||typeof s.targetValue!=='number'||!Number.isFinite(s.targetValue)||s.targetValue<=0||s.targetValue>(s.targetType==='distance'?500000:86400)){issues.push('Bloco não estruturado: mantenha a descrição e confira manualmente.');continue;}
   steps.push({id:`${id}-${i}-${n}`,name:text(s.name,120)||'Bloco',type:s.type,targetType:s.targetType,targetValue:s.targetValue,...(text(s.notes,500)?{notes:text(s.notes,500)}:{}),...( /^\d{1,2}:[0-5]\d$/.test(s.targetPaceMin||'')?{targetPaceMin:s.targetPaceMin}:{}),...(/^\d{1,2}:[0-5]\d$/.test(s.targetPaceMax||'')?{targetPaceMax:s.targetPaceMax}:{})});
  }
  if(Array.isArray(r?.steps)&&r.steps.length>200)issues.push('Muitos blocos: confira a descrição original.');
  return {id:`${id}-${i}`,week:Number.isInteger(r?.week)&&r.week>=1&&r.week<=52?r.week:1,dayIndex:Number.isInteger(r?.dayIndex)&&r.dayIndex>=0&&r.dayIndex<=6?r.dayIndex:null,date,type,description,distanceKm,durationMinutes,steps,issues:[...new Set(issues)]};
 });
 const coverage:ImportCoverage[]|undefined=Array.isArray(raw.coverage)?raw.coverage.filter((w:any)=>Number.isInteger(w.week)&&w.week>0&&w.week<=52&&Array.isArray(w.days)&&w.days.length===7&&new Set(w.days.map((d:any)=>d.dayIndex)).size===7&&w.days.every((d:any)=>Number.isInteger(d.dayIndex)&&d.dayIndex>=0&&d.dayIndex<=6&&['content','blank','not_shown','unreadable'].includes(d.status))).map((w:any)=>({week:w.week,days:w.days.map((d:any)=>({dayIndex:d.dayIndex,status:d.status}))})):undefined;
 return {id,...(coverage?.length?{coverage}:{}),title:text(raw.title,120)||'Planilha importada',createdAt:new Date().toISOString(),sourceNames:sourceNames.slice(0,4).map(name=>text(name,150)),warnings,rows};
}
export function assignImportDates(draft:PlanImportDraft,monday:string):PlanImportDraft{
 if(!validImportDate(monday)||parseDateString(monday).getDay()!==1)throw new Error('Escolha a segunda-feira da primeira semana da planilha.');
 return {...draft,rows:draft.rows.map(row=>({...row,date:row.date||(row.dayIndex===null?'':getWorkoutDateString(monday,row.week-1,row.dayIndex))}))};
}
const addDays=(date:string,n:number)=>{const day=parseDateString(date);day.setDate(day.getDate()+n);return getLocalDateString(day);};
const occupiedDates=(plan:AthletePlan)=>new Set(plan.weeks.flatMap((w,i)=>w.workouts.map((s,d)=>s.date||(plan.startDate?getWorkoutDateString(plan.startDate,i,d):''))).filter(Boolean));
export function importCycleEnd(plan:AthletePlan){
 const dates=[...occupiedDates(plan)].sort();const last=dates[dates.length-1];
 if(last&&plan.weeks.length&&plan.weeks.every(w=>w.id?.startsWith('import-'))&&plan.endDate===last)return addDays(last,6-(parseDateString(last).getDay()+6)%7);
 return plan.endDate;
}
export function importConflicts(plan:AthletePlan,draft:PlanImportDraft,options:{skipExisting?:boolean}={}):string[]{
 const dates=new Set<string>();const errors:string[]=[];
 const occupied=occupiedDates(plan),end=importCycleEnd(plan);
 if(options.skipExisting&&!draft.rows.some(row=>!occupied.has(row.date)))errors.push('Nenhum treino novo: todas as datas selecionadas já possuem programação.');
 for(const row of draft.rows){if(options.skipExisting&&occupied.has(row.date))continue;if(row.distanceKm!==null&&(typeof row.distanceKm!=='number'||!Number.isFinite(row.distanceKm)||row.distanceKm<0||row.distanceKm>500))errors.push('Informe uma distância válida entre 0 e 500 km.');if(row.durationMinutes!==null&&(typeof row.durationMinutes!=='number'||!Number.isFinite(row.durationMinutes)||row.durationMinutes<0||row.durationMinutes>1440))errors.push('Informe uma duração válida entre 0 e 1440 minutos.');if(row.steps.some(step=>!Number.isFinite(step.targetValue)||step.targetValue<=0||step.targetValue>(step.targetType==='distance'?500000:86400)))errors.push('Corrija o valor dos blocos antes de adicionar ao ciclo.');if(!validImportDate(row.date)){errors.push('Há treino sem data válida.');continue;}if(dates.has(row.date))errors.push(`Data repetida na importação: ${row.date}.`);dates.add(row.date);if(occupied.has(row.date))errors.push(`Já existe programação em ${row.date}. Altere a data ou retire esse treino da importação.`);if(plan.weeks.length&&plan.startDate&&row.date<plan.startDate)errors.push(`A data ${row.date} antecede o início do ciclo atual.`);if(plan.weeks.length&&end&&row.date>end)errors.push(`A data ${row.date} está fora do ciclo atual. Arquive o ciclo antes de importar um novo período.`);if(!row.description.trim())errors.push('Preencha a descrição de todos os treinos.');}
 return [...new Set(errors)];
}
/** Only adds hidden weeks. Existing sessions, completed history, free runs and visibility are preserved. */
export function appendImport(plan:AthletePlan,draft:PlanImportDraft,options:{skipExisting?:boolean}={}):AthletePlan{
 const errors=importConflicts(plan,draft,options);if(errors.length)throw new Error(errors.slice(0,4).join(' '));
 const occupied=occupiedDates(plan);const rowsToAdd=options.skipExisting?draft.rows.filter(row=>!occupied.has(row.date)):draft.rows;
 const groups=new Map<string,ImportRow[]>();for(const row of rowsToAdd){const day=parseDateString(row.date);day.setDate(day.getDate()-(day.getDay()+6)%7);const monday=getLocalDateString(day);groups.set(monday,[...(groups.get(monday)||[]),row]);}
 const weeks:TrainingWeek[]=[...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([date,rows],i)=>({id:`import-${draft.id}-${i}`,calendarStartDate:date,weekNumber:plan.weeks.length+i+1,phase:'Base',totalVolume:rows.reduce((n,r)=>n+(r.distanceKm||0),0),isVisible:false,coachNotes:`Importado: ${draft.title}. Revisado pelo treinador.`,workouts:rows.sort((a,b)=>a.date.localeCompare(b.date)).map(row=>({date:row.date,day:importDays[(parseDateString(row.date).getDay()+6)%7],type:row.type,customDescription:row.description,...(row.distanceKm!==null?{distance:row.distanceKm}:{}),...(row.durationMinutes!==null?{durationMinutes:row.durationMinutes}:{}),...(row.steps.length?{structuredWorkout:{description:row.description,steps:row.steps}}:{})}))}));
 const dates=rowsToAdd.map(row=>row.date).sort();return {...plan,...(plan.prescriptionReview?{priorPrescriptionReview:plan.prescriptionReview,prescriptionReview:undefined}:{}),startDate:plan.weeks.length?plan.startDate:dates[0],endDate:plan.weeks.length?importCycleEnd(plan):addDays(dates[dates.length-1],6-(parseDateString(dates[dates.length-1]).getDay()+6)%7),weeks:weeks.reduce((result,incoming)=>{const index=result.findIndex(existing=>existing.id?.startsWith('import-')&&existing.isVisible!==true&&!existing.workouts.some(workout=>workout.completed)&&existing.calendarStartDate===incoming.calendarStartDate);if(index>=0){const existing=result[index];result[index]={...existing,totalVolume:existing.totalVolume+incoming.totalVolume,workouts:[...existing.workouts,...incoming.workouts].sort((a,b)=>(a.date||'').localeCompare(b.date||''))};}else result.push({...incoming,weekNumber:result.length+1});return result;},[...plan.weeks]),importDrafts:(plan.importDrafts||[]).filter(d=>d.id!==draft.id)};
}
