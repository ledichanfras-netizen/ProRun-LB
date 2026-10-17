export const MENSTRUAL_PHASES = {
  none: 'Não informado', menstrual: 'Menstruação', follicular: 'Folicular',
  ovulatory: 'Ovulatória', luteal: 'Lútea', irregular: 'Não regular', unknown: 'Não sei', 'prefer-not': 'Prefiro não informar',
} as const;
export type MenstrualPhase = keyof typeof MENSTRUAL_PHASES;
export const MENSTRUAL_SYMPTOMS = ['Cólica', 'Dor de cabeça', 'Inchaço', 'Dor lombar', 'Sensibilidade nas mamas', 'Alteração de humor', 'Cansaço', 'Fadiga muscular', 'Falta de energia', 'Nenhum'] as const;
export interface MenstrualReadiness {
  menstrualPhase?: MenstrualPhase;
  menstrualSymptoms?: string[];
  menstrualIntensity?: 'mild' | 'moderate' | 'severe' | '';
  menstrualNotes?: string;
}
export const MENSTRUAL_INTENSITIES = {mild:'Leve',moderate:'Moderada',severe:'Forte'} as const;
export function normalizeMenstrualReadiness(value: MenstrualReadiness): MenstrualReadiness {
  const phase=value.menstrualPhase || 'none';
  if(phase==='prefer-not')return {menstrualPhase:phase,menstrualSymptoms:[],menstrualIntensity:'',menstrualNotes:''};
  const symptoms=[...new Set((value.menstrualSymptoms || []).filter(s=>MENSTRUAL_SYMPTOMS.includes(s as any)))];
  const none=symptoms.includes('Nenhum');
  return {menstrualPhase:phase,menstrualSymptoms:none?['Nenhum']:symptoms,menstrualIntensity:!symptoms.length||none?'':value.menstrualIntensity || '',menstrualNotes:(value.menstrualNotes || '').trim().slice(0,500)};
}
/** Cycle reports are display-only: never included in AI input, even in nested histories. */
export function withoutMenstrualData<T>(value:T):T {
  if(Array.isArray(value))return value.map(withoutMenstrualData) as T;
  if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!key.toLowerCase().startsWith('menstrual') && key!=='trackMenstrual').map(([key,v])=>[key,withoutMenstrualData(v)])) as T;
  return value;
}
