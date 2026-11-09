import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {billingToday,billingPeriod,billingEntitlement,validBillingDate,parseMoneyCents,validatedProviderPayment,verifyMercadoSignature,type BillingMembership,type BillingInvoice} from '../utils/billing';
const member:BillingMembership={id:'m',issuer_org_id:'org',subject_type:'athlete',athlete_id:'a',coach_user_id:null,subject_name:'Aluno',amount_cents:15000,months:1,first_due_date:'2026-11-01',enabled:true,grace_days:0,complimentary_until:null};
const invoice:BillingInvoice={id:'i',membership_id:'m',issuer_org_id:'org',subject_name:'Aluno',amount_cents:15000,period_start:'2026-11-01',period_end:'2026-11-30',due_date:'2026-11-01',status:'paid',checkout_url:null,paid_at:null,paid_method:'pix',paid_count:1};
test('billing uses Brazil date before midnight UTC and validates real dates and cent values',()=>{
 assert.equal(billingToday(new Date('2026-11-09T01:00:00Z')),'2026-11-08');
 assert.equal(validBillingDate('2026-02-29'),false);assert.equal(validBillingDate('2028-02-29'),true);
 assert.equal(parseMoneyCents('1.250,50'),125050);assert.equal(parseMoneyCents('150.50'),15050);
 for(const invalid of ['1,234','NaN','-50','0','1000000'])assert.throws(()=>parseMoneyCents(invalid));
});
test('monthly periods preserve end of month due dates and leap years without overlapping',()=>{
 const first=billingPeriod('2028-01-31',1);assert.deepEqual(first,{start:'2028-01-31',end:'2028-02-28',next:'2028-02-29'});
 const second=billingPeriod(first.next,1,31);assert.equal(second.end,'2028-03-30');assert.equal(second.next,'2028-03-31');
 assert.equal(billingPeriod('2026-11-08',12).end,'2027-11-07');
});
test('existing users stay free until enrolled; payments only unlock their covered dates',()=>{
 assert.equal(billingEntitlement(null,[]).allowed,true);
 assert.equal(billingEntitlement({...member,enabled:false},[]).allowed,true);
 assert.equal(billingEntitlement(member,[invoice],'2026-11-30').allowed,true);
 assert.equal(billingEntitlement(member,[invoice],'2026-12-01').allowed,false);
 assert.equal(billingEntitlement(member,[invoice],'2026-10-31').allowed,false);
 assert.equal(billingEntitlement(member,[{...invoice,status:'pending'}],'2026-11-08').allowed,false);
 assert.equal(billingEntitlement(member,[{...invoice,membership_id:'someone-else'}],'2026-11-08').allowed,false);
});
test('grace and courtesy expire on their inclusive dates; reversed payments never release access',()=>{
 assert.equal(billingEntitlement({...member,grace_days:3},[invoice],'2026-12-03').reason,'grace');
 assert.equal(billingEntitlement({...member,grace_days:3},[invoice],'2026-12-04').allowed,false);
 assert.equal(billingEntitlement({...member,complimentary_until:'2026-11-08'},[],'2026-11-08').allowed,true);
 assert.equal(billingEntitlement({...member,complimentary_until:'2026-11-08'},[],'2026-11-09').allowed,false);
 assert.equal(billingEntitlement(member,[{...invoice,status:'reversed'}],'2026-11-08').allowed,false);
});
const payment={live_mode:true,collector_id:123,currency_id:'BRL',external_reference:'i',transaction_amount:150,status:'approved'};
test('only verified real full payment to the correct receiver releases access',()=>{
 assert.equal(validatedProviderPayment(payment,invoice,'123'),'paid');
 for(const change of [{live_mode:false},{collector_id:456},{currency_id:'USD'},{external_reference:'other'},{transaction_amount:149}])assert.throws(()=>validatedProviderPayment({...payment,...change},invoice,'123'));
 assert.equal(validatedProviderPayment({...payment,status:'pending'},invoice,'123'),'pending');
 assert.equal(validatedProviderPayment({...payment,status:'refunded'},invoice,'123'),'reversed');
 assert.equal(validatedProviderPayment({...payment,transaction_amount_refunded:1},invoice,'123'),'reversed');
});
test('Mercado Pago HMAC requires secret, request ID and the signed payment ID',async()=>{
 const manifest='id:123;request-id:req;ts:1742505638683;',secret='private-test-secret';
 const signature='ts=1742505638683,v1='+createHmac('sha256',secret).update(manifest).digest('hex');
 assert.equal(await verifyMercadoSignature(secret,signature,'req','123'),true);
 assert.equal(await verifyMercadoSignature('wrong',signature,'req','123'),false);
 assert.equal(await verifyMercadoSignature(secret,signature,'req','124'),false);
 assert.equal(await verifyMercadoSignature(secret,signature,'','123'),false);
 assert.equal(await verifyMercadoSignature(secret,'ts=1,v1=invalid','req','123'),false);
});

test('annual and quarterly contracts preserve exact installment totals and cover every day',async()=>{
 const {buildBillingSchedule}=await import('../utils/billing');
 const schedule=buildBillingSchedule({plan_kind:'contract',payment_schedule:'monthly',months:12,first_due_date:'2028-01-31',amount_cents:100001});
 assert.equal(schedule.length,12);assert.equal(schedule.reduce((sum,p)=>sum+p.amount_cents,0),100001);
 assert.equal(schedule[0].period_end,'2028-02-28');assert.equal(schedule[1].period_start,'2028-02-29');assert.equal(schedule[2].period_start,'2028-03-31');
 assert.equal(schedule[11].period_end,'2029-01-30');
 for(let i=1;i<schedule.length;i++)assert.equal(new Date(schedule[i].period_start+'T12:00:00Z').getTime()-new Date(schedule[i-1].period_end+'T12:00:00Z').getTime(),86400000);
});
test('periodization uses fixed contracted dates; full and monthly payments preserve the same contract end',async()=>{
 const {buildBillingSchedule}=await import('../utils/billing');
 const input={plan_kind:'periodization' as const,payment_schedule:'full' as const,months:1,first_due_date:'2026-11-09',contract_end:'2027-01-31',amount_cents:10001};
 assert.equal(buildBillingSchedule(input)[0].period_end,'2027-01-31');
 const parts=buildBillingSchedule({...input,payment_schedule:'monthly'});
 assert.deepEqual(parts.map(p=>p.amount_cents),[3334,3334,3333]);assert.equal(parts[2].period_end,'2027-01-31');
 assert.throws(()=>buildBillingSchedule({...input,contract_end:'2026-11-08'}));
 assert.throws(()=>buildBillingSchedule({...input,payment_schedule:'monthly',amount_cents:200}));
});
test('a first installment cannot unlock the rest of an annual contract',async()=>{
 const {buildBillingSchedule}=await import('../utils/billing');
 const schedule=buildBillingSchedule({plan_kind:'contract',payment_schedule:'monthly',months:12,first_due_date:'2026-11-01',amount_cents:120000});
 const invoices=schedule.map((p,i)=>({...invoice,...p,id:'i'+i,status:i===0?'paid' as const:'pending' as const}));
 assert.equal(billingEntitlement(member,invoices,'2026-11-30').allowed,true);
 assert.equal(billingEntitlement(member,invoices,'2026-12-01').allowed,false);
});
test('WhatsApp link uses a validated Brazilian number and URL-encoded reviewable text',async()=>{
 const {billingWhatsappLink}=await import('../utils/billing');
 const alert:any={subject_name:'Atleta & Parceiro',kind:'renewal',target_date:'2026-11-15',phone:'(43) 99999-1234'};
 const link=new URL(billingWhatsappLink(alert));assert.equal(link.pathname,'/5543999991234');assert.match(link.searchParams.get('text')!,/Atleta & Parceiro/);
 assert.equal(new URL(billingWhatsappLink({...alert,phone:'invalid'})).pathname,'/');
});
