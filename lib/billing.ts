import {supabase} from './supabase';
import type {BillingMembership,BillingInvoice} from '../utils/billing';
export interface BillingOverview {members:BillingMembership[];self:BillingMembership|null;invoices:BillingInvoice[];targets:{type:'athlete'|'coach';id:string;name:string}[];access:{allowed:boolean;reason:string;until:string|null};connection:{collector_id:string;expires_at:string}|null;configured:boolean;callbackUrl:string;webhookUrl:string;}
export async function billingRequest(action:string,params:Record<string,unknown>={}) {
 const {data,error}=await supabase.functions.invoke('prorun-billing',{body:{...params,action}});
 if(error){let message='Não foi possível consultar as mensalidades. Confira a conexão e tente novamente.';try{message=(await (error as any).context?.json())?.error||message;}catch{}throw new Error(message);}
 if(data?.error)throw new Error(data.error);return data;
}
export const refreshBilling=()=>window.dispatchEvent(new Event('prorun-billing-changed'));
