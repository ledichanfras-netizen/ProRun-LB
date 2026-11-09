import type {AthletePlan} from '../types';
const key=(athleteId:string)=>`prorun_prescription_draft_v1:${athleteId}`;
export function savePrescriptionDraft(athleteId:string,plan:AthletePlan):boolean{
 try{localStorage.setItem(key(athleteId),JSON.stringify(plan));return true;}catch{return false;}
}
export function readPrescriptionDraft(athleteId:string):AthletePlan|null{
 try{const plan=JSON.parse(localStorage.getItem(key(athleteId))||'null');return (plan?.prescriptionReview||plan?.editorDraft===true)&&Array.isArray(plan.weeks)?plan:null;}catch{return null;}
}
export function clearPrescriptionDraft(athleteId:string){try{localStorage.removeItem(key(athleteId));}catch{}}
