import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {pathToFileURL} from 'node:url';
test('the generation service sends selected organization to the prompt and retains it in the returned plan and review',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'prorun-planning-'));
 try{
 const days=['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];
 const response={raceStrategy:'Conferir com treinador',motivationalMessage:'',weeks:[{phase:'Base',coachNotes:'Prioridade específica',workouts:days.map((day,i)=>({day,type:i===6?'Prova':i===1||i===3?'Fortalecimento':i===5?'Descanso':'Regenerativo',distance:i===6?10:i===1||i===3||i===5?0:5,customDescription:'Sessão para conferência',objective:'Objetivo',capacity:'Capacidade',method:'Método'}))}]};
 const outfile=join(directory,'service.cjs');
 await build({entryPoints:[resolve('services/geminiService.ts')],bundle:true,platform:'node',format:'cjs',outfile,plugins:[{name:'mock-ai-transport',setup(b){b.onResolve({filter:/lib\/access$/},()=>({path:'mock-access',namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:`export async function requestAI(purpose,payload){globalThis.__planningRequest={purpose,payload};return {text:${JSON.stringify(JSON.stringify(response))}};}`,loader:'js'}));}}]});
 const loaded=await import(pathToFileURL(outfile).href);const generateTrainingPlan=loaded.generateTrainingPlan||loaded.default.generateTrainingPlan;
 const selected={model:'blocks',distribution:'pyramidal',notes:'Prioridade do treinador',blocks:[{id:'a',fromWeek:1,toWeek:1,priority:'Prioridade específica',notes:''}]};
 const athlete={id:'qa',name:'QA',age:30,weight:70,height:175,metrics:{vdot:40,fcMax:190,fcThreshold:170},readinessHistory:[],archivedPlans:[],injuryHistory:''};
 const plan=await generateTrainingPlan(athlete,'Teste',1,4,2,'10km','2026-11-15','Objetivo','2026-11-09',[0,1,2,3,4,6],[0,2,4,6],[1,3],6,null,selected);
 const request=(globalThis as any).__planningRequest;assert.equal(request.purpose,'periodization');assert.ok(request.payload.contents.includes('Modelo: Em blocos'));assert.ok(request.payload.contents.includes('Distribuição do tempo de corrida: Piramidal'));assert.ok(request.payload.contents.includes('Prioridade específica'));assert.deepEqual(plan.cyclePlanning,selected);assert.deepEqual(plan.prescriptionReview.constraints.cyclePlanning,selected);assert.ok(plan.weeks.every((w:any)=>!w.isVisible));
 const simple=await generateTrainingPlan(athlete,'Descrição livre: foco no limiar',1,4,2,'10km','2026-11-15','Objetivo','2026-11-09',[0,1,2,3,4,6],[0,2,4,6],[1,3],6,null);
 const simpleRequest=(globalThis as any).__planningRequest;assert.ok(simpleRequest.payload.contents.includes('Descrição livre: foco no limiar'));assert.ok(!simpleRequest.payload.contents.includes('ESCOLHAS DO TREINADOR (são decisões diferentes'));assert.equal(simple.cyclePlanning,undefined);assert.equal(simple.prescriptionReview.constraints.cyclePlanning,undefined);
 }finally{delete (globalThis as any).__planningRequest;await rm(directory,{recursive:true,force:true});}
});
