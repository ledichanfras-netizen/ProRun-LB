import React from 'react';
import {MENSTRUAL_PHASES,MENSTRUAL_SYMPTOMS,MENSTRUAL_INTENSITIES,normalizeMenstrualReadiness,type MenstrualReadiness as CycleRecord,type MenstrualPhase} from '../utils/menstrualReadiness';

export function MenstrualReadinessFields({value,onChange}:{value:CycleRecord;onChange:(value:CycleRecord)=>void}){
 const change=(patch:CycleRecord)=>onChange(normalizeMenstrualReadiness({...value,...patch}));
 const declined=value.menstrualPhase==='prefer-not';
 return <section className="space-y-4 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-slate-950/70">
  <h3 className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">Ciclo menstrual — opcional</h3>
  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">Registro para você e seu treinador. Não altera a nota de prontidão nem a prescrição da IA.</p>
  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">Fase informada<select aria-label="Fase do ciclo menstrual" value={value.menstrualPhase || 'none'} onChange={e=>change({menstrualPhase:e.target.value as MenstrualPhase})} className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-3 text-base">{Object.entries(MENSTRUAL_PHASES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
  {!declined&&<>
   <fieldset><legend className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">Sintomas sentidos hoje</legend><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{MENSTRUAL_SYMPTOMS.map(symptom=><label key={symptom} className="flex items-center gap-2 p-2 min-h-[44px] text-xs text-slate-800 dark:text-slate-200"><input type="checkbox" checked={value.menstrualSymptoms?.includes(symptom)||false} onChange={e=>{const current=value.menstrualSymptoms||[];change({menstrualSymptoms:e.target.checked?(symptom==='Nenhum'?['Nenhum']:[...current.filter(s=>s!=='Nenhum'),symptom]):current.filter(s=>s!==symptom)});}}/>{symptom}</label>)}</div></fieldset>
   {!!value.menstrualSymptoms?.length&&!value.menstrualSymptoms.includes('Nenhum')&&<label className="block text-xs font-bold text-slate-800 dark:text-slate-200">Intensidade dos sintomas<select aria-label="Intensidade dos sintomas menstruais" value={value.menstrualIntensity || ''} onChange={e=>change({menstrualIntensity:e.target.value as CycleRecord['menstrualIntensity']})} className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-3 text-base"><option value="">Não informada</option>{Object.entries(MENSTRUAL_INTENSITIES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}
   <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">Observação do ciclo (opcional)<textarea aria-label="Observação do ciclo menstrual" maxLength={500} rows={3} value={value.menstrualNotes||''} onChange={e=>onChange({...value,menstrualNotes:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-3 text-base resize-y"/></label>
  </>}
 </section>;
}
export function MenstrualReadinessSummary({value}:{value:CycleRecord}){
 if(!value.menstrualPhase&&!value.menstrualSymptoms?.length&&!value.menstrualNotes)return null;
 return <div className="mt-3 rounded-xl border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-slate-800 dark:text-slate-200 break-words space-y-1">
  <p><strong>Ciclo menstrual:</strong> {MENSTRUAL_PHASES[value.menstrualPhase || 'none'] || 'Não informado'}</p>
  {value.menstrualPhase!=='prefer-not'&&<><p><strong>Sintomas:</strong> {value.menstrualSymptoms?.length?value.menstrualSymptoms.join(', '):'Não informados'}{value.menstrualIntensity?` · ${MENSTRUAL_INTENSITIES[value.menstrualIntensity]}`:''}</p>{value.menstrualNotes&&<p className="whitespace-pre-wrap"><strong>Observação:</strong> {value.menstrualNotes}</p>}</>}
  <p className="text-slate-600 dark:text-slate-400">Informativo · sem efeito no score ou na IA</p>
 </div>;
}
