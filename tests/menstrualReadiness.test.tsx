import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {normalizeMenstrualReadiness,withoutMenstrualData,MENSTRUAL_PHASES} from '../utils/menstrualReadiness';
import {MenstrualReadinessFields,MenstrualReadinessSummary} from '../components/MenstrualReadiness';

test('optional phase choices and symptoms render without phase-based prescriptions',()=>{
 const html=renderToStaticMarkup(<MenstrualReadinessFields value={{menstrualPhase:'unknown',menstrualSymptoms:['Cólica'],menstrualIntensity:'moderate'}} onChange={()=>{}}/>);
 for(const label of Object.entries(MENSTRUAL_PHASES).filter(([id])=>id!=='none').map(([,label])=>label))assert.ok(html.includes(label));
 assert.match(html,/aria-pressed/);assert.match(html,/pink-600/);assert.doesNotMatch(html,/<select|type="checkbox"/);
 assert.match(html,/Sintomas sentidos hoje/);assert.match(html,/Observação do ciclo/);assert.doesNotMatch(html,/Pico de Potência|Priorizar recuperação|Estrogênio alto/);
});
test('none is explicit, symptoms mutually exclusive, declining clears private details',()=>{
 assert.deepEqual(normalizeMenstrualReadiness({menstrualSymptoms:['Nenhum','Cólica'],menstrualIntensity:'severe'}).menstrualSymptoms,['Nenhum']);
 assert.equal(normalizeMenstrualReadiness({menstrualSymptoms:['Nenhum'],menstrualIntensity:'severe'}).menstrualIntensity,'');
 const declined=normalizeMenstrualReadiness({menstrualPhase:'prefer-not',menstrualSymptoms:['Cólica'],menstrualIntensity:'severe',menstrualNotes:'Privado'});
 assert.deepEqual(declined,{menstrualPhase:'prefer-not',menstrualSymptoms:[],menstrualIntensity:'',menstrualNotes:''});
 assert.equal(normalizeMenstrualReadiness({}).menstrualSymptoms?.length,0);
});
test('cycle details persist as JSON and appear in coach/student summaries',()=>{
 const record=normalizeMenstrualReadiness({menstrualPhase:'luteal',menstrualSymptoms:['Cólica','Cansaço'],menstrualIntensity:'moderate',menstrualNotes:' Observação pessoal '});
 const protectedRow={athlete_id:'test',date:'2026-10-17',report:record};
 const reloaded=JSON.parse(JSON.stringify(protectedRow));
 const html=renderToStaticMarkup(<MenstrualReadinessSummary value={reloaded.report}/>);
 const portal=readFileSync('pages/AthletePortal.tsx','utf8');
 assert.match(portal,/normalizeMenstrualReadiness\(portalCycle\)/);
 assert.doesNotMatch(portal,/ProtectedMenstrualReadiness|Criar acesso protegido/);
 assert.match(portal,/setPortalCycle\(existing \? normalizeMenstrualReadiness\(existing\) : \{\}\)/);
 assert.match(html,/Lútea/);assert.match(html,/Cólica, Cansaço/);assert.match(html,/Monitoramento Hormonal/);assert.match(html,/Moderada/);assert.match(html,/Observação pessoal/);
});
test('AI sanitizer strips menstrual data at every nested level without changing readiness or source records',()=>{
 const original={gender:'female',trackMenstrual:true,lastReadiness:{readinessScore:82,menstrualPhase:'menstrual',menstrualSymptoms:['Cólica'],menstrualIntensity:'severe',menstrualNotes:'Privado'},readinessHistory:[{readinessScore:82,menstrualNotes:'Privado'}],weeks:[{workouts:[{menstrualPhase:'luteal',distance:5}]}]};
 const before=JSON.stringify(original);const safe=withoutMenstrualData(original);
 assert.doesNotMatch(JSON.stringify(safe),/menstrual|Privado|Cólica|trackMenstrual/);assert.equal(safe.lastReadiness.readinessScore,82);assert.equal(safe.weeks[0].workouts[0].distance,5);assert.equal(JSON.stringify(original),before);
 for(const file of ['services/geminiService.ts','services/performanceService.ts'])assert.match(readFileSync(file,'utf8'),/athlete = withoutMenstrualData\(athlete\)/);
 const portal=readFileSync('pages/AthletePortal.tsx','utf8');const formula=portal.slice(portal.indexOf('const calculatedScore ='),portal.indexOf('const rawRestingHR'));
 assert.doesNotMatch(formula,/menstrual|portalCycle|portalMenstrual/);
});
