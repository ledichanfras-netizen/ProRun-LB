import {supabase} from './supabase';
export interface AccessAccount {user_id:string;organization_id:string;login:string;name:string;role:'coach'|'athlete';platform_admin:boolean;athlete_id:string|null;active:boolean;must_change_password:boolean;}
export async function accessRequest(action:string,params:Record<string,unknown>={}){
 const {data,error}=await supabase.functions.invoke('prorun-access',{body:{...params,action}});
 if(error){let message='Não foi possível concluir o acesso.';try{const body=await (error as any).context?.json();message=body?.error||message;}catch{}throw new Error(message);}
 if(data?.error)throw new Error(data.error);return data;
}
export async function requestAI(purpose:'analysis'|'periodization'|'strength',payload:any){
 const {data}=await supabase.auth.getSession();if(!data.session)throw new Error('Entre novamente para utilizar a IA.');
 const response=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({...payload,purpose})});
 const result=await response.json();if(!response.ok)throw Object.assign(new Error(result.error||'Não foi possível consultar a IA.'),{status:response.status});return result;
}
