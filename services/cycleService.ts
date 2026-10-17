import {supabase} from '../lib/supabase';
import {normalizeMenstrualReadiness,type MenstrualReadiness} from '../utils/menstrualReadiness';
export interface CycleAccess {role:'coach'|'athlete';athlete_id:string|null;email:string}
export async function getCycleAccess():Promise<CycleAccess|null>{
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return null;
 const result=await supabase.from('cycle_access').select('role,athlete_id,email').eq('user_id',user.id).maybeSingle();
 if(result.error)throw result.error;return result.data as CycleAccess|null;
}
export async function loadCycleReport(athleteId:string,date:string){
 const {data,error}=await supabase.from('cycle_reports').select('report').eq('athlete_id',athleteId).eq('date',date).maybeSingle();
 if(error)throw error;return normalizeMenstrualReadiness((data?.report||{}) as MenstrualReadiness);
}
export async function saveCycleReport(athleteId:string,date:string,report:MenstrualReadiness){
 const {error}=await supabase.from('cycle_reports').upsert({athlete_id:athleteId,date,report:normalizeMenstrualReadiness(report),updated_at:new Date().toISOString()},{onConflict:'athlete_id,date'});
 if(error)throw error;
}
export async function authorizeCycleStudent(athleteId:string,email:string){
 const {error}=await supabase.from('cycle_access').insert({athlete_id:athleteId,email:email.trim().toLowerCase(),role:'athlete'});
 if(error)throw error;
}
export async function deleteCycleReport(athleteId:string,date:string){
 const {error}=await supabase.from('cycle_reports').delete().eq('athlete_id',athleteId).eq('date',date);if(error)throw error;
}
