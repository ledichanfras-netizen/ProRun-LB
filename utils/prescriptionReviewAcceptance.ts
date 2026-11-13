import type {AthletePlan} from '../types';
export interface PrescriptionReviewAcceptance {athleteId:string;fingerprint:string;reviewedAt:string;}
const storageKey=(id:string)=>`prorun_review_accepted_v1:${id}`;
/** UI acknowledgement of prescribed content; execution and publication changes do not invalidate it. */
export function prescriptionReviewFingerprint(plan:AthletePlan):string {
 const content={review:plan.prescriptionReview,cyclePlanning:plan.cyclePlanning,startDate:plan.startDate,endDate:plan.endDate,specificGoal:plan.specificGoal,raceDistance:plan.raceDistance,trainingDays:plan.trainingDays,runningDaysOfWeek:plan.runningDaysOfWeek,gymDaysOfWeek:plan.gymDaysOfWeek,weeks:plan.weeks.map(w=>({id:w.id,weekNumber:w.weekNumber,calendarStartDate:w.calendarStartDate,phase:w.phase,coachNotes:w.coachNotes,workouts:w.workouts.map(s=>({day:s.day,date:s.date,type:s.type,customDescription:s.customDescription,distance:s.distance,durationMinutes:s.durationMinutes,plannedDurationMinutes:s.plannedDurationMinutes,plannedIntensity:s.plannedIntensity,objective:s.objective,capacity:s.capacity,method:s.method,exercises:s.exercises,structuredWorkout:s.structuredWorkout}))}))};
 const text=JSON.stringify(content,(_key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])):value);
 let a=0x811c9dc5,b=0x9e3779b9;
 for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b^text.charCodeAt(i),2246822519);}
 return `v1-${text.length}-${(a>>>0).toString(16)}-${(b>>>0).toString(16)}`;
}
export function isPrescriptionReviewAccepted(plan:AthletePlan|null,athleteId:string|null):boolean {
 if(!plan?.prescriptionReview||!athleteId)return false;
 const matches=(value:PrescriptionReviewAcceptance|undefined)=>value?.athleteId===athleteId&&value.fingerprint===prescriptionReviewFingerprint(plan);
 if(matches(plan.prescriptionReviewAcceptance))return true;
 try{return matches(JSON.parse(localStorage.getItem(storageKey(athleteId))||'null')||undefined);}catch{return false;}
}
export function acceptPrescriptionReview(plan:AthletePlan,athleteId:string):AthletePlan {
 const acceptance={athleteId,fingerprint:prescriptionReviewFingerprint(plan),reviewedAt:new Date().toISOString()};
 try{localStorage.setItem(storageKey(athleteId),JSON.stringify(acceptance));}catch{/* The plan/draft still retains the acknowledgement when storage is unavailable. */}
 return {...plan,prescriptionReviewAcceptance:acceptance};
}
