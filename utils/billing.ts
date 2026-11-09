/** Billing periods are inclusive Brazilian calendar dates, never UTC instants. */
export function billingToday(now = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function validBillingDate(value: unknown): value is string {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const d=new Date(value+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;
}
export function shiftBillingDate(value:string,days:number):string {
  const d=new Date(value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);
}
/** Preserve the original due day when a shorter month intervenes. */
export function billingPeriod(start:string,months:number,anchorDay=Number(start.slice(8))) {
  if(!validBillingDate(start)||![1,3,6,12].includes(months))throw new Error('Período inválido.');
  const d=new Date(start+'T12:00:00Z');d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);
  const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
  d.setUTCDate(Math.min(anchorDay,last));const next=d.toISOString().slice(0,10);
  return {start,end:shiftBillingDate(next,-1),next};
}
export const moneyBRL=(cents:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
export function parseMoneyCents(value:string):number {
  const raw=value.trim().replace(/\s|R\$/g,'');
  const normalized=raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw;
  if(!/^\d+(\.\d{1,2})?$/.test(normalized))throw new Error('Informe um valor válido com até duas casas decimais.');
  const cents=Math.round(Number(normalized)*100);
  if(!Number.isSafeInteger(cents)||cents<100||cents>10000000)throw new Error('Valor deve estar entre R$ 1 e R$ 100.000.');
  return cents;
}
export interface BillingMembership {plan_kind?:BillingPlanKind;payment_schedule?:'full'|'monthly';contract_end?:string|null;contract_key?:string;cycle_label?:string|null;id:string;issuer_org_id:string;subject_type:'athlete'|'coach';athlete_id:string|null;coach_user_id:string|null;subject_name:string;amount_cents:number;months:number;first_due_date:string;enabled:boolean;grace_days:number;complimentary_until:string|null;}
export interface BillingInvoice {contract_key?:string|null;installment_number?:number;installment_count?:number;term_end?:string|null;id:string;membership_id:string;issuer_org_id:string;issuer_name?:string;subject_name:string;amount_cents:number;period_start:string;period_end:string;due_date:string;status:'pending'|'paid'|'cancelled'|'reversed';checkout_url:string|null;paid_at:string|null;paid_method:string|null;paid_count:number;provider_preference_id?:string|null;}
export function billingEntitlement(m:BillingMembership|null,invoices:BillingInvoice[],today=billingToday()) {
  if(!m||!m.enabled)return {allowed:true,reason:'free',until:null as string|null};
  if(m.complimentary_until&&m.complimentary_until>=today)return {allowed:true,reason:'courtesy',until:m.complimentary_until};
  const paid=invoices.filter(i=>i.membership_id===m.id&&i.status==='paid'&&i.period_start<=today).sort((a,b)=>b.period_end.localeCompare(a.period_end));
  const active=paid.find(i=>i.period_end>=today);
  if(active)return {allowed:true,reason:'paid',until:active.period_end};
  const grace=paid.find(i=>shiftBillingDate(i.period_end,m.grace_days)>=today);
  return grace?{allowed:true,reason:'grace',until:shiftBillingDate(grace.period_end,m.grace_days)}:{allowed:false,reason:'unpaid',until:paid[0]?.period_end||null};
}
export function validatedProviderPayment(payment:any,invoice:BillingInvoice,collectorId:string) {
  if(payment.live_mode!==true||String(payment.collector_id)!==String(collectorId)||payment.currency_id!=='BRL'||payment.external_reference!==invoice.id||Math.round(Number(payment.transaction_amount)*100)!==invoice.amount_cents)throw new Error('Pagamento não corresponde à cobrança.');
  if(!['approved','refunded','charged_back','pending','in_process','rejected','cancelled','in_mediation','authorized'].includes(payment.status))throw new Error('Estado do pagamento não reconhecido.');
  return payment.status==='approved'&&Number(payment.transaction_amount_refunded||0)===0?'paid':payment.status==='refunded'||payment.status==='charged_back'||Number(payment.transaction_amount_refunded||0)>0?'reversed':'pending';
}
export async function verifyMercadoSignature(secret:string,signature:string,requestId:string,dataId:string):Promise<boolean> {
  const parts=Object.fromEntries(signature.split(',').map(s=>s.trim().split('=')));
  if(!secret||!requestId||!dataId||!/^\d+$/.test(parts.ts||'')||!/^[a-f0-9]{64}$/i.test(parts.v1||''))return false;
  const encoder=new TextEncoder();const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const bytes=new Uint8Array(parts.v1.match(/../g)!.map((x:string)=>parseInt(x,16)));
  return crypto.subtle.verify('HMAC',key,bytes,encoder.encode(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`));
}

export type BillingPlanKind='recurring'|'contract'|'periodization';
export interface BillingScheduleInput {plan_kind:BillingPlanKind;payment_schedule:'full'|'monthly';months:number;first_due_date:string;contract_end?:string|null;amount_cents:number;}
export interface BillingInstallment {period_start:string;period_end:string;due_date:string;amount_cents:number;installment_number:number;installment_count:number;}
export const billingDaysBetween=(from:string,to:string)=>Math.round((Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000);
/** A fixed contract is split into monthly coverage periods; cents always sum to its total. */
export function buildBillingSchedule(input:BillingScheduleInput):BillingInstallment[] {
 const {plan_kind,payment_schedule,first_due_date:start,amount_cents}=input;
 if(!validBillingDate(start)||!['recurring','contract','periodization'].includes(plan_kind)||!['full','monthly'].includes(payment_schedule)||!Number.isSafeInteger(amount_cents)||amount_cents<100||amount_cents>10000000)throw new Error('Confira as condições do plano.');
 if(plan_kind==='recurring'&&payment_schedule!=='full')throw new Error('Parcelas mensais exigem um contrato com término definido.');
 const end=plan_kind==='periodization'?input.contract_end:billingPeriod(start,input.months).end;
 if(!validBillingDate(end)||end<start||billingDaysBetween(start,end)>3660)throw new Error('Informe início e término válidos, com duração máxima de dez anos.');
 const periods:{start:string;end:string}[]=[];
 if(payment_schedule==='full')periods.push({start,end});
 else {
  let cursor=start;
  while(cursor<=end){if(periods.length>=120)throw new Error('Limite de parcelas excedido.');const next=billingPeriod(cursor,1,Number(start.slice(8)));periods.push({start:cursor,end:next.end<end?next.end:end});cursor=next.next;}
 }
 const amount=Math.floor(amount_cents/periods.length),extra=amount_cents%periods.length;
 if(amount<100)throw new Error('Cada parcela deve ter valor mínimo de R$ 1.');
 return periods.map((p,i)=>({period_start:p.start,period_end:p.end,due_date:p.start,amount_cents:amount+(i<extra?1:0),installment_number:i+1,installment_count:periods.length}));
}
export interface BillingAlert {id:string;membership_id:string;subject_name:string;subject_type:'athlete'|'coach';audience:'issuer'|'payer';kind:'payment'|'renewal';target_date:string;days_remaining:number;restriction_date:string|null;title:string;message:string;phone?:string;read:boolean;}
export function billingWhatsappLink(alert:BillingAlert):string {
 const digits=(alert.phone||'').replace(/\D/g,'');const phone=digits.length===10||digits.length===11?'55'+digits:/^55\d{10,11}$/.test(digits)?digits:'';
 const name=alert.subject_name;const date=alert.target_date.split('-').reverse().join('/');
 const text=`Olá, ${name}! ${alert.kind==='renewal'?'Seu plano no ProRun LB termina':'Sua parcela no ProRun LB vence'} em ${date}. Vamos organizar a renovação/pagamento para manter seu acompanhamento?`;
 return 'https://wa.me/'+phone+'?text='+encodeURIComponent(text);
}
