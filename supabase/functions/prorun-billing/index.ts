// @ts-nocheck
// Public provider callbacks verify HMAC/OAuth state. Every app action validates getUser().
import {createClient} from 'npm:@supabase/supabase-js@2.101.0';
import {billingToday,billingPeriod,billingEntitlement,validBillingDate,validatedProviderPayment,verifyMercadoSignature,shiftBillingDate,buildBillingSchedule,billingDaysBetween} from '../../../utils/billing.ts';
const cloudUrl=Deno.env.get('SUPABASE_URL')!;
const db=createClient(cloudUrl,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const APP_URL='https://prorunlb-prbv.onrender.com';
const endpoint=cloudUrl+'/functions/v1/prorun-billing';
const redirectUri=endpoint+'?action=oauth-callback';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,GET,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const check=(r:any)=>{if(r.error)throw new Error('Não foi possível salvar ou consultar os dados.');return r.data;};
const hash=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))).map(n=>n.toString(16).padStart(2,'0')).join('');
const base64url=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const returnApp=(result:string)=>new Response(null,{status:303,headers:{Location:APP_URL+'/#/subscriptions?connection='+result,'Cache-Control':'no-store'}});
async function mp(path:string,token:string|null,body?:any,method?:string){
 const response=await fetch('https://api.mercadopago.com'+path,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('Mercado Pago indisponível ou autorização inválida. Verifique a conexão da conta.');return response.json();
}
async function settings(){return check(await db.from('prorun_billing_settings').select('*').eq('id',true).maybeSingle());}
async function memberFor(actor:any){
 if(actor.platform_admin)return null;
 let q=db.from('prorun_memberships').select('*');q=actor.role==='athlete'?q.eq('athlete_id',actor.athlete_id):q.eq('coach_user_id',actor.user_id);
 return check(await q.maybeSingle());
}
async function access(actor:any){
 const member=await memberFor(actor);const invoices=member?check(await db.from('prorun_billing_invoices').select('*').eq('membership_id',member.id)):[];
 return {...billingEntitlement(member,invoices),member};
}
async function ownedMember(actor:any,id:string,manage=false){
 const m=check(await db.from('prorun_memberships').select('*').eq('id',id).single());
 const owns=actor.role==='coach'&&m.issuer_org_id===actor.organization_id;
 const self=(m.subject_type==='athlete'&&actor.role==='athlete'&&m.athlete_id===actor.athlete_id)||(m.subject_type==='coach'&&m.coach_user_id===actor.user_id);
 if(manage?!owns:!owns&&!self)throw new Error('Cobrança fora do seu acesso.');return m;
}
async function connection(org:string){
 let c=check(await db.from('prorun_billing_connections').select('*').eq('organization_id',org).maybeSingle());
 if(!c)throw new Error('O responsável ainda não conectou a conta Mercado Pago.');
 if(Date.parse(c.expires_at)<Date.now()+60000){
  const s=await settings();if(!s)throw new Error('Integração ainda não configurada.');
  const token=await mp('/oauth/token',null,{client_id:s.client_id,client_secret:s.client_secret,grant_type:'refresh_token',refresh_token:c.refresh_token});
  c={...c,access_token:token.access_token,refresh_token:token.refresh_token,expires_at:new Date(Date.now()+token.expires_in*1000).toISOString(),updated_at:new Date().toISOString()};
  check(await db.from('prorun_billing_connections').upsert(c));
 }return c;
}
async function reconcile(paymentId:string,org:string){
 if(!/^\d{1,30}$/.test(paymentId))throw new Error('Pagamento inválido.');
 const c=await connection(org);const payment=await mp('/v1/payments/'+paymentId,c.access_token);
 if(typeof payment.external_reference!=='string'||!/^[-a-f0-9]{36}$/i.test(payment.external_reference))return {ignored:true};
 const invoice=check(await db.from('prorun_billing_invoices').select('*').eq('id',payment.external_reference).eq('issuer_org_id',org).maybeSingle());
 if(!invoice)return {ignored:true};
 const state=validatedProviderPayment(payment,invoice,c.collector_id);
 if(!payment.date_last_updated||!Number.isFinite(Date.parse(payment.date_last_updated)))throw new Error('Data de confirmação inválida.');
 return check(await db.rpc('prorun_billing_receipt',{p_invoice:invoice.id,p_actor:null,p_method:'mercado_pago',p_note:'',p_provider_id:paymentId,p_state:state,p_updated:payment.date_last_updated,p_paid_at:payment.date_approved||null}));
}
async function issue(m:any){
 if(m.plan_kind&&m.plan_kind!=='recurring'){
  const schedule=buildBillingSchedule(m);
  const invoices=check(await db.rpc('prorun_billing_issue_contract',{p_member:m.id,p_schedule:schedule}));
  return invoices.find(i=>['pending','reversed'].includes(i.status))||invoices[invoices.length-1];
 }
 const existing=check(await db.from('prorun_billing_invoices').select('*').eq('membership_id',m.id).neq('status','cancelled').order('period_start',{ascending:false}).limit(1));
 if(existing[0]?.status==='pending'||existing[0]?.status==='reversed')return existing[0];
 const next=existing[0]?shiftBillingDate(existing[0].period_end,1):m.first_due_date;
 const start=existing[0]&&next<billingToday()?billingToday():next;
 const period=billingPeriod(start,m.months,Number(m.first_due_date.slice(8)));
 return check(await db.rpc('prorun_billing_issue',{p_member:m.id,p_start:period.start,p_end:period.end}));
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 const respond=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers});
 const url=new URL(req.url),callback=url.searchParams.get('action');
 try{
  if(callback==='oauth-callback'){
   if(req.method!=='GET')return respond({error:'Método inválido.'},405);
   const raw=url.searchParams.get('state')||'',code=url.searchParams.get('code');
   if(!raw||!code||raw.length>200||code.length>1000)return returnApp('error');
   const state=check(await db.from('prorun_billing_oauth').update({consumed_at:new Date().toISOString()}).eq('state_hash',await hash(raw)).is('consumed_at',null).gt('expires_at',new Date().toISOString()).select('*').maybeSingle());
   if(!state)return returnApp('error');
   const actor=check(await db.from('prorun_accounts').select('*').eq('user_id',state.user_id).eq('active',true).single());
   if(actor.role!=='coach'||actor.organization_id!==state.organization_id||actor.must_change_password||!(await access(actor)).allowed)return returnApp('error');
   const s=await settings();if(!s)return returnApp('error');
   const token=await mp('/oauth/token',null,{client_id:s.client_id,client_secret:s.client_secret,grant_type:'authorization_code',code,redirect_uri:redirectUri,code_verifier:state.verifier});
   if(!token.access_token||!token.refresh_token||!token.user_id||!token.expires_in)return returnApp('error');
   check(await db.from('prorun_billing_connections').upsert({organization_id:actor.organization_id,collector_id:String(token.user_id),access_token:token.access_token,refresh_token:token.refresh_token,expires_at:new Date(Date.now()+token.expires_in*1000).toISOString(),connected_by:actor.user_id,updated_at:new Date().toISOString()}));
   return returnApp('ok');
  }
  if(callback==='webhook'){
   if(req.method!=='POST')return respond({error:'Método inválido.'},405);
   const s=await settings(),dataId=url.searchParams.get('data.id')||'',org=url.searchParams.get('organization')||'';
   if(!s||!await verifyMercadoSignature(s.webhook_secret,req.headers.get('x-signature')||'',req.headers.get('x-request-id')||'',dataId))return respond({error:'Assinatura inválida.'},401);
   const body=await req.json();if(body.type!=='payment')return respond({received:true});
   if(String(body.data?.id)!==dataId)return respond({error:'Notificação inválida.'},400);
   const receiver=org||check(await db.from('prorun_billing_connections').select('organization_id').eq('collector_id',String(body.user_id)).maybeSingle())?.organization_id;
   if(!receiver)return respond({received:true});
   await reconcile(dataId,receiver);return respond({received:true});
  }
  if(req.method!=='POST')return respond({error:'Método inválido.'},405);
  const bearer=req.headers.get('Authorization')||'';
  if(!bearer.startsWith('Bearer '))return respond({error:'Entre novamente.'},401);
  const {data,error}=await db.auth.getUser(bearer.slice(7));if(error||!data.user)return respond({error:'Sessão inválida.'},401);
  const actor=check(await db.from('prorun_accounts').select('*').eq('user_id',data.user.id).eq('active',true).single());
  if(actor.must_change_password)return respond({error:'Atualize sua senha antes de continuar.'},403);
  const body=await req.json(),action=body.action;
  if(action==='access')return respond(await access(actor));
  if(action==='notice-read'||action==='notice-dismiss'){
   check(await db.from('prorun_billing_notices').update(action==='notice-read'?{read:true}:{dismissed:true}).eq('id',body.noticeId).eq('user_id',actor.user_id));return respond({success:true});
  }
  if(action==='reminders'){
   check(await db.rpc('prorun_billing_refresh_notices',{p_user:actor.user_id}));
   const entitlement=await access(actor);
   let q=db.from('prorun_billing_notices').select('*').eq('user_id',actor.user_id).eq('resolved',false).order('target_date');
   if(actor.role==='coach'&&!entitlement.allowed)q=q.eq('audience','payer');
   const rows=check(await q);
   const memberIds=[...new Set(rows.filter(n=>n.audience==='issuer').map(n=>n.membership_id))];
   const members=memberIds.length?check(await db.from('prorun_memberships').select('id,athlete_id').in('id',memberIds).eq('issuer_org_id',actor.organization_id)):[];
   const athleteIds=members.map(m=>m.athlete_id).filter(Boolean);
   const athletes=athleteIds.length?check(await db.from('athletes').select('id,data').in('id',athleteIds).eq('organization_id',actor.organization_id)):[];
   return respond({notices:rows.filter(n=>!n.dismissed).map(n=>({id:'billing:'+n.id,title:n.title,message:n.message,type:n.stage<0?'warning':'info',category:'payment',timestamp:n.created_at,read:n.read,link:'/subscriptions'})),alerts:rows.map(n=>({id:n.id,membership_id:n.membership_id,subject_name:n.subject_name,subject_type:n.subject_type,audience:n.audience,kind:n.kind,target_date:n.target_date,days_remaining:billingDaysBetween(billingToday(),n.target_date),restriction_date:n.restriction_date,title:n.title,message:n.message,read:n.read,phone:athletes.find(a=>a.id===members.find(m=>m.id===n.membership_id)?.athlete_id)?.data?.phone||''}))});
  }
  if(action==='overview'){
   const self=await memberFor(actor),entitlement=await access(actor);
   let members=actor.role==='coach'&&entitlement.allowed?check(await db.from('prorun_memberships').select('*').eq('issuer_org_id',actor.organization_id).order('subject_name')):[];
   const ownInvoices=self?check(await db.from('prorun_billing_invoices').select('*').eq('membership_id',self.id)):[];
   // Generate only the next due renewal, never a debit or charge on a saved card.
   if(self?.enabled&&!ownInvoices.some(i=>['pending','reversed'].includes(i.status))){
    const last=ownInvoices.sort((a,b)=>b.period_end.localeCompare(a.period_end))[0];
    if(!last||last.period_end<=shiftBillingDate(billingToday(),7))await issue(self);
   }
   let invoices=members.length?check(await db.from('prorun_billing_invoices').select('*').in('membership_id',members.map(m=>m.id)).order('created_at',{ascending:false})):[];
   if(self){const list=check(await db.from('prorun_billing_invoices').select('*').eq('membership_id',self.id).order('created_at',{ascending:false}));invoices=[...invoices,...list];}
   const targets=[];
   if(actor.role==='coach'&&entitlement.allowed){
    const athletes=check(await db.from('athletes').select('id,data').eq('organization_id',actor.organization_id));
    for(const a of athletes)targets.push({type:'athlete',id:a.id,name:a.data?.name||'Aluno'});
    if(actor.platform_admin){const coaches=check(await db.from('prorun_accounts').select('user_id,name').eq('role','coach').eq('platform_admin',false));for(const c of coaches)targets.push({type:'coach',id:c.user_id,name:c.name});}
   }
   const c=actor.role==='coach'?check(await db.from('prorun_billing_connections').select('collector_id,expires_at').eq('organization_id',actor.organization_id).maybeSingle()):null;
   const orgIds=[...new Set(invoices.map(i=>i.issuer_org_id))];
   const organizations=orgIds.length?check(await db.from('prorun_organizations').select('id,name').in('id',orgIds)):[];
   invoices=invoices.map(i=>({...i,issuer_name:organizations.find(o=>o.id===i.issuer_org_id)?.name||'Responsável'}));
   const s=await settings();return respond({members,self,invoices,targets,access:entitlement,connection:c,configured:!!s,callbackUrl:redirectUri,webhookUrl:endpoint+'?action=webhook'});
  }
  if(action==='checkout'||action==='sync'){
   const invoice=check(await db.from('prorun_billing_invoices').select('*').eq('id',body.invoiceId).single());await ownedMember(actor,invoice.membership_id);
   if(action==='sync'){
    const c=await connection(invoice.issuer_org_id);
    const result=await mp('/v1/payments/search?external_reference='+encodeURIComponent(invoice.id)+'&sort=date_created&criteria=desc&limit=30',c.access_token);
    for(const p of result.results||[])await reconcile(String(p.id),invoice.issuer_org_id);
    return respond({success:true});
   }
   if(!['pending','reversed'].includes(invoice.status))throw new Error('Esta cobrança não está pendente.');
   if(invoice.checkout_url)return respond({url:invoice.checkout_url});
   const c=await connection(invoice.issuer_org_id);if(!await settings())throw new Error('Integração ainda não configurada.');
   const preference=await mp('/checkout/preferences',c.access_token,{items:[{id:invoice.id,title:'ProRun LB · '+invoice.subject_name,description:'Mensalidade '+invoice.period_start+' a '+invoice.period_end,quantity:1,currency_id:'BRL',unit_price:invoice.amount_cents/100}],external_reference:invoice.id,notification_url:endpoint+'?action=webhook&organization='+invoice.issuer_org_id,back_urls:{success:APP_URL+'/?billing=return#/subscriptions',pending:APP_URL+'/?billing=return#/subscriptions',failure:APP_URL+'/?billing=return#/subscriptions'},auto_return:'approved'});
   if(!preference.id||typeof preference.init_point!=='string'||!preference.init_point.startsWith('https://www.mercadopago.com.br/'))throw new Error('Checkout indisponível.');
   // Keep the first successfully persisted preference if two devices request it.
   const updated=check(await db.from('prorun_billing_invoices').update({checkout_url:preference.init_point,provider_preference_id:preference.id}).eq('id',invoice.id).is('checkout_url',null).select('checkout_url').maybeSingle());
   const actual=updated||check(await db.from('prorun_billing_invoices').select('checkout_url').eq('id',invoice.id).single());return respond({url:actual.checkout_url});
  }
  if(actor.role!=='coach'||!(await access(actor)).allowed)return respond({error:'Acesso financeiro de gestão não autorizado.'},403);
  if(action==='settings'){
   if(!actor.platform_admin)return respond({error:'Somente o administrador configura a integração.'},403);
   if(typeof body.clientId!=='string'||!/^\d{3,40}$/.test(body.clientId)||typeof body.clientSecret!=='string'||body.clientSecret.length<8||body.clientSecret.length>500||typeof body.webhookSecret!=='string'||body.webhookSecret.length<8||body.webhookSecret.length>500)throw new Error('Preencha os dados da aplicação Mercado Pago.');
   check(await db.from('prorun_billing_settings').upsert({id:true,client_id:body.clientId,client_secret:body.clientSecret,webhook_secret:body.webhookSecret,updated_at:new Date().toISOString()}));return respond({success:true});
  }
  if(action==='connect'){
   const s=await settings();if(!s)throw new Error('O administrador precisa configurar a integração Mercado Pago primeiro.');
   const state=crypto.randomUUID()+crypto.randomUUID(),verifier=base64url(crypto.getRandomValues(new Uint8Array(48)));
   const challenge=base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
   check(await db.from('prorun_billing_oauth').delete().eq('user_id',actor.user_id));
   check(await db.from('prorun_billing_oauth').insert({state_hash:await hash(state),user_id:actor.user_id,organization_id:actor.organization_id,verifier,expires_at:new Date(Date.now()+600000).toISOString()}));
   const params=new URLSearchParams({client_id:s.client_id,response_type:'code',platform_id:'mp',state,redirect_uri:redirectUri,code_challenge:challenge,code_challenge_method:'S256'});
   return respond({url:'https://auth.mercadopago.com/authorization?'+params});
  }
  if(action==='save'){
   let existing=null;if(body.id)existing=await ownedMember(actor,body.id,true);
   let subjectName,athleteId=null,coachId=null;
   if(existing){subjectName=existing.subject_name;athleteId=existing.athlete_id;coachId=existing.coach_user_id;}
   else if(body.subjectType==='athlete'){
    const a=check(await db.from('athletes').select('id,data,organization_id').eq('id',body.subjectId).eq('organization_id',actor.organization_id).single());athleteId=a.id;subjectName=a.data?.name||'Aluno';
   }else if(body.subjectType==='coach'&&actor.platform_admin){
    const c=check(await db.from('prorun_accounts').select('user_id,name').eq('user_id',body.subjectId).eq('role','coach').eq('platform_admin',false).single());coachId=c.user_id;subjectName=c.name;
   }else throw new Error('Destinatário inválido.');
   const newTerm=body.newTerm===true;
   const planKind=body.planKind||existing?.plan_kind||'recurring';
   const paymentSchedule=body.paymentSchedule||existing?.payment_schedule||'full';
   const firstDueDate=existing&&!newTerm?existing.first_due_date:body.firstDueDate;
   const schedule=buildBillingSchedule({plan_kind:planKind,payment_schedule:paymentSchedule,months:body.months,first_due_date:firstDueDate,contract_end:existing&&!newTerm?existing.contract_end:body.contractEnd,amount_cents:body.amountCents});
   const contractEnd=planKind==='recurring'?null:schedule[schedule.length-1].period_end;
   if(!Number.isInteger(body.graceDays)||body.graceDays<0||body.graceDays>30||(body.complimentaryUntil&&!validBillingDate(body.complimentaryUntil)))throw new Error('Confira a tolerância e a cortesia.');
   const member=check(await db.rpc('prorun_billing_save_v2',{p_actor:actor.user_id,p_new_term:newTerm,p_schedule:schedule,p_member:{id:existing?.id||null,issuer_org_id:actor.organization_id,subject_type:coachId?'coach':'athlete',athlete_id:athleteId,coach_user_id:coachId,subject_name:subjectName,amount_cents:body.amountCents,months:body.months,first_due_date:firstDueDate,enabled:body.enabled===true,grace_days:body.graceDays,complimentary_until:body.complimentaryUntil||null,plan_kind:planKind,payment_schedule:paymentSchedule,contract_end:contractEnd,cycle_label:typeof body.cycleLabel==='string'?body.cycleLabel.slice(0,120):null}}));
   return respond({success:true});
  }
  if(action==='issue'){const m=await ownedMember(actor,body.membershipId,true);return respond({invoice:await issue(m)});}
  if(action==='cancel'||action==='reverse_manual'){
   const i=check(await db.from('prorun_billing_invoices').select('*').eq('id',body.invoiceId).single());await ownedMember(actor,i.membership_id,true);
   if(typeof body.note!=='string'||!body.note.trim()||body.note.length>500)throw new Error('Informe o motivo da correção.');
   return respond({invoice:check(await db.rpc('prorun_billing_correct',{p_invoice:i.id,p_actor:actor.user_id,p_action:action,p_note:body.note}))});
  }
  if(action==='manual'){
   const i=check(await db.from('prorun_billing_invoices').select('*').eq('id',body.invoiceId).single());await ownedMember(actor,i.membership_id,true);
   if(typeof body.note!=='string'||body.note.length>500||!validBillingDate(body.paidDate)||body.paidDate>billingToday())throw new Error('Informe a data do recebimento e uma observação válida.');
   const invoice=check(await db.rpc('prorun_billing_receipt',{p_invoice:i.id,p_actor:actor.user_id,p_method:body.method,p_note:body.note,p_paid_at:body.paidDate+'T15:00:00Z'}));return respond({invoice});
  }
  return respond({error:'Ação inválida.'},400);
 }catch(error){
  // Never log provider errors, tokens, request bodies, or OAuth parameters.
  if(callback==='oauth-callback')return returnApp('error');
  return respond({error:callback==='webhook'?'Não foi possível confirmar a notificação.':String(error?.message||'Não foi possível concluir.').slice(0,180)},callback==='webhook'?503:400);
 }
});
