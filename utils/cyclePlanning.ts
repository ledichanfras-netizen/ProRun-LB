import {getWorkoutDateString,getLocalDateString,parseDateString} from './time.ts';
import type {AthletePlan,TrainingWeek,WorkoutStep} from '../types';
export type PeriodizationModel=''|'linear'|'undulating'|'blocks'|'custom';
export type IntensityDistribution=''|'polarized'|'pyramidal'|'threshold'|'custom';
export type PlannedIntensity='low'|'moderate'|'high'|'passive';
export interface CycleBlock{id:string;fromWeek:number;toWeek:number;priority:string;targetKm?:number;notes:string;}
export interface CyclePlanning{model:PeriodizationModel;distribution:IntensityDistribution;notes:string;blocks:CycleBlock[];target?:{low:number;moderate:number;high:number};}
export const periodizationModels=[{id:'linear',label:'Linear',description:'Organize uma progressão predominante de volume e intensidade ao longo do ciclo, com recuperação e aproximação da prova definidas pelo treinador.'},{id:'undulating',label:'Ondulatório',description:'Alterne os estímulos de volume e intensidade dentro da semana ou entre semanas, explicitando a recuperação.'},{id:'blocks',label:'Em blocos',description:'Organize períodos com prioridades definidas, preservando as capacidades necessárias entre os blocos.'},{id:'custom',label:'Personalizado',description:'Descreva a lógica de organização escolhida para este atleta.'}] as const;
export const intensityDistributions=[{id:'polarized',label:'Polarizada',description:'Maior parcela do tempo em baixa intensidade, parcela menor em alta e pouco tempo na faixa intermediária. Ajuste ao contexto do atleta.'},{id:'pyramidal',label:'Piramidal',description:'Maior parcela do tempo em baixa intensidade, seguida de moderada e depois alta.'},{id:'threshold',label:'Foco no limiar',description:'Distribuição com ênfase no trabalho próximo ao limiar, preservando os demais estímulos e a recuperação definidos pelo treinador.'},{id:'custom',label:'Personalizada',description:'Defina a distribuição e, se desejar, as porcentagens de tempo pretendidas.'}] as const;
export const emptyCyclePlanning=():CyclePlanning=>({model:'',distribution:'',notes:'',blocks:[]});
export function validateCyclePlanning(p:CyclePlanning,weeks:number,required=false){
 const errors:string[]=[];
 if(required||p.model||p.distribution){if(!periodizationModels.some(m=>m.id===p.model))errors.push('Escolha o modelo de periodização.');if(!intensityDistributions.some(m=>m.id===p.distribution))errors.push('Escolha a distribuição de intensidade.');}
 if((p.model==='custom'||p.distribution==='custom')&&!p.notes.trim())errors.push('Descreva a organização personalizada.');
 const seen=new Set<number>();for(const b of p.blocks){if(!Number.isInteger(b.fromWeek)||!Number.isInteger(b.toWeek)||b.fromWeek<1||b.toWeek<b.fromWeek||b.toWeek>weeks){errors.push('Confira o início e o fim dos blocos dentro da duração do ciclo.');continue;}if(!b.priority.trim())errors.push('Preencha a prioridade de cada bloco.');if(b.targetKm!==undefined&&(!Number.isFinite(b.targetKm)||b.targetKm<0))errors.push('Informe um volume alvo válido para o bloco.');for(let i=b.fromWeek;i<=b.toWeek;i++){if(seen.has(i))errors.push('Há semanas incluídas em mais de um bloco.');seen.add(i);}}
 if(p.target){const values=Object.values(p.target);if(values.some(v=>!Number.isFinite(v)||v<0||v>100)||Math.abs(values.reduce((a,b)=>a+b,0)-100)>.01)errors.push('As três porcentagens desejadas precisam somar 100%.');}
 return [...new Set(errors)];
}
export function planningPrompt(p:CyclePlanning){return `ESCOLHAS DO TREINADOR (são decisões diferentes e devem ser respeitadas):\nModelo: ${periodizationModels.find(m=>m.id===p.model)?.label||'Não definido'}. ${periodizationModels.find(m=>m.id===p.model)?.description||''}\nDistribuição do tempo de corrida: ${intensityDistributions.find(m=>m.id===p.distribution)?.label||'Não definida'}. ${intensityDistributions.find(m=>m.id===p.distribution)?.description||''}\n${p.target?'Alvo de tempo definido pelo treinador: '+JSON.stringify(p.target)+' (%).':'Não há percentuais fixados pelo treinador; não imponha automaticamente 80/20.'}\nBlocos definidos: ${JSON.stringify(p.blocks)}\nOrientações adicionais: ${p.notes}\nExplicite nos coachNotes de cada semana como a proposta organiza o modelo, a prioridade e a recuperação. Não afirme que a distribuição foi atingida sem quantificar o tempo das sessões e dos segmentos. Baixa, moderada e alta são um modelo de três faixas, não uma tradução automática das cinco zonas de pace. A classificação final será conferida pelo treinador. A escolha do modelo não autoriza aumento de carga sem contexto.`;}
const running=new Set(['Rodagem','Regenerativo','Longão','Limiar','Intervalado','Maratona','Velocidade','Prova']);
function paceSeconds(p?:string){if(!p||!/^\d{1,2}:[0-5]\d$/.test(p))return null;const [m,s]=p.split(':').map(Number);return m*60+s||null;}
export function stepPlannedMinutes(step:WorkoutStep){if(step.targetType==='time'&&Number.isFinite(step.targetValue)&&step.targetValue>0)return {minutes:step.targetValue/60,estimated:false};if(step.targetType==='distance'&&Number.isFinite(step.targetValue)&&step.targetValue>0){const lo=paceSeconds(step.targetPaceMin),hi=paceSeconds(step.targetPaceMax)||lo;if(lo&&hi)return {minutes:step.targetValue/1000*(lo+hi)/120,estimated:true};}return {minutes:null,estimated:false};}
export function weekIntensity(week:TrainingWeek){
 const totals={low:0,moderate:0,high:0,unknown:0,passive:0,estimatedMinutes:0,missingDuration:0,unclassified:0,plannedKm:0,demandingDays:0};
 const count=(minutes:number|null,band:PlannedIntensity|undefined,estimated=false)=>{if(minutes===null){if(band!=='passive')totals.missingDuration++;return;}if(band==='passive'){totals.passive+=minutes;return;}if(band==='low'||band==='moderate'||band==='high')totals[band]+=minutes;else{totals.unknown+=minutes;totals.unclassified++;}if(estimated)totals.estimatedMinutes+=minutes;};
 for(const w of week.workouts){if(!running.has(w.type))continue;totals.plannedKm+=Number(w.distance)||0;if(['Limiar','Intervalado','Velocidade','Longão','Prova','Maratona'].includes(w.type))totals.demandingDays++;
  if(w.structuredWorkout?.steps.length){for(const step of w.structuredWorkout.steps){const t=stepPlannedMinutes(step);const passive=/pausa passiva|recupera[çc][aã]o passiva/i.test(`${step.name} ${step.notes||''}`);count(t.minutes,step.plannedIntensity||(passive?'passive':undefined),t.estimated);}}
  else{const minutes=w.plannedDurationMinutes;count(typeof minutes==='number'&&Number.isFinite(minutes)&&minutes>0?minutes:null,w.plannedIntensity);}
 }
 const total=totals.low+totals.moderate+totals.high+totals.unknown;return {...totals,total,complete:totals.missingDuration===0&&totals.unclassified===0,percent:{low:total?totals.low/total*100:0,moderate:total?totals.moderate/total*100:0,high:total?totals.high/total*100:0}};
}
export function createManualCycle(args:{weeks:number;startDate:string;endDate?:string;planning:CyclePlanning;runningDays:number[];gymDays:number[];goal:string}):AthletePlan{
 const valid=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&getLocalDateString(parseDateString(date))===date;
 if(!Number.isInteger(args.weeks)||args.weeks<1||args.weeks>52)throw new Error('Informe uma duração válida para o ciclo.');
 if(!args.runningDays.length&&!args.gymDays.length)throw new Error('Selecione ao menos um dia de treino.');
 if(!valid(args.startDate)||args.endDate&&(!valid(args.endDate)||args.endDate<args.startDate))throw new Error('Confira o início e o fim do ciclo.');
 const errors=validateCyclePlanning(args.planning,args.weeks,true);if(errors.length)throw new Error(errors.join(' '));
 const days=['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];
 const phases=['Base','Construção','Pico','Polimento'] as const;
 return {editorDraft:true,cyclePlanning:args.planning,startDate:args.startDate,endDate:args.endDate||undefined,specificGoal:args.goal,
  weeks:Array.from({length:args.weeks},(_,i)=>{
   const block=args.planning.blocks.find(b=>b.fromWeek<=i+1&&b.toWeek>=i+1);
   return {id:crypto.randomUUID(),weekNumber:i+1,
    phase:phases.find(phase=>phase.toLocaleLowerCase()===block?.priority.trim().toLocaleLowerCase())||'Base',
    coachNotes:[block?.priority,block?.notes||args.planning.notes].filter(Boolean).join(' · '),
    totalVolume:0,isVisible:false,workouts:days.map((day,d)=>{
     const date=getWorkoutDateString(args.startDate,i,d),outside=date<args.startDate||!!args.endDate&&date>args.endDate;
     return {day,date,type:outside?'Descanso':args.runningDays.includes(d)?'Rodagem':args.gymDays.includes(d)?'Fortalecimento':'Descanso',customDescription:'',...(!outside&&args.runningDays.includes(d)?{}:{distance:0})};
    })};
  })};
}
