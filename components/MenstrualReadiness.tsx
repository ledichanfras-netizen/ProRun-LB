import React from 'react';
import {Heart} from 'lucide-react';
import {MENSTRUAL_PHASES,MENSTRUAL_SYMPTOMS,MENSTRUAL_INTENSITIES,normalizeMenstrualReadiness,type MenstrualReadiness as CycleRecord,type MenstrualPhase} from '../utils/menstrualReadiness';

const panel='rounded-[1.75rem] border border-pink-200 bg-pink-50/80 dark:border-pink-500/25 dark:bg-pink-950/20 p-4 sm:p-6 space-y-5 text-slate-800 dark:text-slate-100 min-w-0';
const choice=(active:boolean)=>`min-h-[52px] rounded-2xl border px-3 py-3 text-[11px] sm:text-xs font-extrabold uppercase leading-relaxed break-words transition-colors ${active?'border-pink-500 bg-pink-600 text-white shadow-sm':'border-slate-300 bg-white text-slate-700 hover:border-pink-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'}`;
const phases:MenstrualPhase[]=['follicular','ovulatory','luteal','menstrual','irregular'];
const symptomLabel=(s:string)=>({'Nenhum':'Sem sintomas','Sensibilidade nas mamas':'Sensibilidade nos seios','Alteração de humor':'Mudança de humor'}[s]||s);

export function MenstrualReadinessFields({value,onChange}:{value:CycleRecord;onChange:(value:CycleRecord)=>void}){
 const change=(patch:CycleRecord)=>onChange(normalizeMenstrualReadiness({...value,...patch}));
 const declined=value.menstrualPhase==='prefer-not';
 return <section className={panel}>
  <h3 className="flex items-center gap-2 text-sm font-black text-pink-700 dark:text-pink-300 uppercase tracking-wide"><Heart className="w-5 h-5 shrink-0" aria-hidden="true"/>Ciclo menstrual & sintomatologia</h3>
  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">Opcional. Informe como você se sente para acompanhar com seu treinador. Sem efeito na nota de prontidão ou na prescrição da IA.</p>
  <fieldset><legend className="text-xs font-black uppercase tracking-wider mb-3">Fase atual do ciclo</legend><div className="grid grid-cols-2 gap-2 sm:gap-3">{phases.map(id=><button key={id} type="button" aria-pressed={value.menstrualPhase===id} className={choice(value.menstrualPhase===id)} onClick={()=>change({menstrualPhase:value.menstrualPhase===id?'none':id})}>{MENSTRUAL_PHASES[id]}</button>)}</div><div className="mt-3 flex flex-wrap gap-2">{(['unknown','prefer-not'] as MenstrualPhase[]).map(id=><button key={id} type="button" aria-pressed={value.menstrualPhase===id} onClick={()=>change({menstrualPhase:value.menstrualPhase===id?'none':id})} className={choice(value.menstrualPhase===id)}>{MENSTRUAL_PHASES[id]}</button>)}</div></fieldset>
  {!declined&&<>
   <fieldset><legend className="text-xs font-black uppercase tracking-wider mb-3">Sintomas sentidos hoje</legend><div className="grid grid-cols-2 gap-2 sm:gap-3">{MENSTRUAL_SYMPTOMS.map(symptom=>{const selected=value.menstrualSymptoms?.includes(symptom)||false;return <button key={symptom} type="button" aria-pressed={selected} className={choice(selected)} onClick={()=>{const current=value.menstrualSymptoms||[];change({menstrualSymptoms:selected?current.filter(s=>s!==symptom):symptom==='Nenhum'?['Nenhum']:[...current.filter(s=>s!=='Nenhum'),symptom]});}}>{symptomLabel(symptom)}</button>;})}</div></fieldset>
   {!!value.menstrualSymptoms?.length&&!value.menstrualSymptoms.includes('Nenhum')&&<fieldset><legend className="text-xs font-black uppercase tracking-wider mb-3">Intensidade dos sintomas</legend><div className="grid grid-cols-3 gap-2">{Object.entries(MENSTRUAL_INTENSITIES).map(([id,label])=><button key={id} type="button" aria-pressed={value.menstrualIntensity===id} className={choice(value.menstrualIntensity===id)} onClick={()=>change({menstrualIntensity:value.menstrualIntensity===id?'':id as CycleRecord['menstrualIntensity']})}>{label}</button>)}</div></fieldset>}
   <label className="block text-xs font-bold">Observação do ciclo (opcional)<textarea aria-label="Observação do ciclo menstrual" maxLength={500} rows={3} value={value.menstrualNotes||''} onChange={e=>onChange({...value,menstrualNotes:e.target.value})} className="mt-2 w-full rounded-2xl border border-pink-200 dark:border-pink-500/30 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-3 text-base resize-y"/></label>
  </>}
 </section>;
}
export function MenstrualReadinessSummary({value,date,showEmpty=false}:{value:CycleRecord;date?:string;showEmpty?:boolean}){
 const hasReport=!!(value.menstrualPhase&&value.menstrualPhase!=='none'||value.menstrualSymptoms?.length||value.menstrualNotes);
 if(!hasReport&&!showEmpty)return null;
 return <section className={`${panel} mt-3 w-full text-xs !space-y-3`}>
  <h3 className="flex items-center gap-2 font-black text-pink-700 dark:text-pink-300 uppercase tracking-wide"><Heart className="w-4 h-4 shrink-0" aria-hidden="true"/>Monitoramento Hormonal</h3>
  <p className="text-slate-600 dark:text-slate-300">Ciclo e sintomas informados pela aluna{date?` · ${date.split('-').reverse().join('/')}`:''}</p>
  {!hasReport?<p>Nenhum registro do ciclo informado. Preenchimento opcional na prontidão.</p>:<>
   <p><strong>Fase informada:</strong> {MENSTRUAL_PHASES[value.menstrualPhase || 'none'] || 'Não informado'}</p>
   {value.menstrualPhase!=='prefer-not'&&<><p><strong>Sintomas:</strong> {value.menstrualSymptoms?.length?value.menstrualSymptoms.map(symptomLabel).join(', '):'Não informados'}</p>{value.menstrualIntensity&&<p><strong>Intensidade:</strong> {MENSTRUAL_INTENSITIES[value.menstrualIntensity]}</p>}{value.menstrualNotes&&<p className="whitespace-pre-wrap break-words"><strong>Observação:</strong> {value.menstrualNotes}</p>}</>}
  </>}
  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">Acompanhamento informativo para conversar sobre ajustes no treino conforme os sintomas. Não mede níveis hormonais e não altera o score ou a IA.</p>
 </section>;
}
