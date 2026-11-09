alter table public.prorun_memberships
 add column plan_kind text not null default 'recurring' check(plan_kind in('recurring','contract','periodization')),
 add column payment_schedule text not null default 'full' check(payment_schedule in('full','monthly')),
 add column contract_end date,
 add column contract_key uuid not null default gen_random_uuid(),
 add column cycle_label text;
alter table public.prorun_memberships add constraint prorun_contract_dates check((plan_kind='recurring' and payment_schedule='full' and contract_end is null) or(plan_kind<>'recurring' and contract_end is not null and contract_end>=first_due_date));
alter table public.prorun_billing_invoices
 add column contract_key uuid,
 add column installment_number integer not null default 1,
 add column installment_count integer not null default 1,
 add column term_end date,
 add constraint prorun_term_boundaries check(term_end is null or term_end>=period_end),
 add constraint prorun_installment_order check(installment_number between 1 and installment_count and installment_count between 1 and 120);
create index prorun_invoice_contract on public.prorun_billing_invoices(membership_id,contract_key);
-- Service-only transaction: enrollment, contract snapshots and installment ledger commit together.
create or replace function public.prorun_billing_save_v2(p_actor uuid,p_member jsonb,p_schedule jsonb,p_new_term boolean default false) returns jsonb language plpgsql security invoker set search_path='' as $$
declare old_m public.prorun_memberships;m public.prorun_memberships;item jsonb;new_terms boolean;previous_end date;total bigint;cnt integer;key uuid;begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 if p_member->>'id' is not null then select * into old_m from public.prorun_memberships where id=(p_member->>'id')::uuid for update;if old_m.id is null then raise exception 'Plano não encontrado';end if;end if;
 new_terms=old_m.id is null or p_new_term;
 if not new_terms and (coalesce(p_member->>'plan_kind','recurring')<>old_m.plan_kind or coalesce(p_member->>'payment_schedule','full')<>old_m.payment_schedule or (p_member->>'contract_end')::date is distinct from old_m.contract_end) then raise exception 'Use Novo período para alterar as condições do contrato';end if;
 if not new_terms and old_m.plan_kind<>'recurring' and ((p_member->>'amount_cents')::int<>old_m.amount_cents or (p_member->>'months')::int<>old_m.months) then raise exception 'As parcelas emitidas devem ser preservadas. Use Novo período';end if;
 if p_new_term then
 select max(period_end) into previous_end from public.prorun_billing_invoices where membership_id=old_m.id and status<>'cancelled';
 if previous_end>=(p_member->>'first_due_date')::date then raise exception 'O novo período deve começar após as cobranças já emitidas';end if;
 end if;
 m=jsonb_populate_record(null::public.prorun_memberships,public.prorun_billing_save_member(p_actor,p_member));
 if new_terms then
 key=gen_random_uuid();
 update public.prorun_memberships set plan_kind=p_member->>'plan_kind',payment_schedule=p_member->>'payment_schedule',first_due_date=(p_member->>'first_due_date')::date,contract_end=(p_member->>'contract_end')::date,contract_key=key,cycle_label=nullif(left(p_member->>'cycle_label',120),'') where id=m.id returning * into m;
 if jsonb_typeof(p_schedule)<>'array' or jsonb_array_length(p_schedule) not between 1 and 120 then raise exception 'Parcelamento inválido';end if;
 select sum((value->>'amount_cents')::bigint),count(*) into total,cnt from jsonb_array_elements(p_schedule);
 if total<>m.amount_cents or (p_schedule->0->>'period_start')::date<>m.first_due_date or (m.contract_end is not null and (p_schedule->(cnt-1)->>'period_end')::date<>m.contract_end) then raise exception 'As parcelas não correspondem ao contrato';end if;
 previous_end=null;
 for item in select value from jsonb_array_elements(p_schedule) loop
 if previous_end is not null and (item->>'period_start')::date<>previous_end+1 then raise exception 'As parcelas devem cobrir períodos consecutivos';end if;
 insert into public.prorun_billing_invoices(membership_id,issuer_org_id,subject_name,amount_cents,period_start,period_end,due_date,contract_key,installment_number,installment_count,term_end)
 values(m.id,m.issuer_org_id,m.subject_name,(item->>'amount_cents')::int,(item->>'period_start')::date,(item->>'period_end')::date,(item->>'due_date')::date,key,(item->>'installment_number')::int,cnt,m.contract_end);
 previous_end=(item->>'period_end')::date;
 end loop;
 insert into public.prorun_billing_events(actor_id,membership_id,event,details) values(p_actor,m.id,'contract_started',jsonb_build_object('contract_key',key,'plan_kind',m.plan_kind,'payment_schedule',m.payment_schedule,'start',m.first_due_date,'end',m.contract_end,'total_cents',m.amount_cents,'installments',cnt,'cycle_label',m.cycle_label));
 end if;
 return to_jsonb(m);end $$;
revoke all on function public.prorun_billing_save_v2(uuid,jsonb,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.prorun_billing_save_v2(uuid,jsonb,jsonb,boolean) to service_role;
create table public.prorun_billing_notices (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,membership_id uuid not null references public.prorun_memberships(id) on delete cascade,
 audience text not null check(audience in('issuer','payer')),kind text not null check(kind in('payment','renewal')),target_date date not null,stage integer not null,
 subject_name text not null,subject_type text not null,title text not null,message text not null,restriction_date date,
 read boolean not null default false,dismissed boolean not null default false,resolved boolean not null default false,created_at timestamptz not null default now(),
 unique(user_id,membership_id,kind,target_date,stage)
);
create index prorun_notice_user on public.prorun_billing_notices(user_id,resolved,target_date);
create index prorun_notice_membership on public.prorun_billing_notices(membership_id);
alter table public.prorun_billing_notices enable row level security;
revoke all on public.prorun_billing_notices from public,anon,authenticated;
grant all on public.prorun_billing_notices to service_role;
create policy service_only_billing on public.prorun_billing_notices for all to anon,authenticated using(false) with check(false);
-- These functions remain private. Daily jobs persist reminders even while recipients are offline.
create or replace function prorun_private.refresh_billing_notices(p_user uuid default null,p_today date default (now() at time zone 'America/Sao_Paulo')::date) returns integer language plpgsql security invoker set search_path='' as $$
declare r record;due public.prorun_billing_invoices;paid_end date;previous_paid date;targets date[];kinds text[];target date;v_kind text;restriction date;days integer;v_stage integer;idx integer;v_title text;v_message text;subject text;total integer=0;begin
 update public.prorun_billing_notices set resolved=true where not resolved and (p_user is null or user_id=p_user);
 for r in select m.*,a.user_id,a.role,a.athlete_id as account_athlete,case when a.role='coach' and a.organization_id=m.issuer_org_id then 'issuer' else 'payer' end as audience
 from public.prorun_memberships m join public.prorun_accounts a on (a.role='coach' and a.organization_id=m.issuer_org_id) or (m.athlete_id=a.athlete_id and a.role='athlete') or m.coach_user_id=a.user_id
 where a.active and not a.must_change_password and (p_user is null or a.user_id=p_user) loop
 select * into due from public.prorun_billing_invoices where membership_id=r.id and status in('pending','reversed') order by due_date,period_start limit 1;
 select max(period_end) into paid_end from public.prorun_billing_invoices where membership_id=r.id and status='paid';
 targets=array[]::date[];kinds=array[]::text[];
 if r.plan_kind='recurring' then
  if due.id is not null and (paid_end is null or due.period_start<=paid_end) then targets=array[due.due_date];kinds=array['payment'];
  elsif paid_end is not null then targets=array[paid_end];kinds=array['renewal'];
  elsif due.id is not null then targets=array[due.due_date];kinds=array['payment'];end if;
 else
  if due.id is not null then targets=array_append(targets,due.due_date);kinds=array_append(kinds,'payment');end if;
  targets=array_append(targets,r.contract_end);kinds=array_append(kinds,'renewal');
 end if;
 if coalesce(array_length(targets,1),0)=0 then continue;end if;
 for idx in 1..array_length(targets,1) loop
  target=targets[idx];v_kind=kinds[idx];days=target-p_today;
  if target is null or days>7 then continue;end if;
  restriction=null;
  if r.enabled then
   if v_kind='renewal' then restriction=target+r.grace_days+1;
   else select max(period_end) into previous_paid from public.prorun_billing_invoices where membership_id=r.id and status='paid' and period_end<due.period_start;
    restriction=case when previous_paid is null then due.period_start else previous_paid+r.grace_days+1 end;
   end if;
   if r.complimentary_until is not null then restriction=greatest(restriction,r.complimentary_until+1);end if;
  end if;
  v_stage=case when days>3 then 7 when days>1 then 3 when days=1 then 1 when days=0 then 0 when restriction is not null and p_today>=restriction then -2 else -1 end;
  subject=case when r.audience='payer' then 'Seu ' else r.subject_name||': ' end;
  v_title=subject||case when v_kind='renewal' then 'plano' else 'pagamento' end||case when days>0 then ' vence em '||days||' dia(s)' when days=0 then ' vence hoje' else ' vencido' end;
  v_message=case when v_kind='renewal' then 'Validade do plano: ' else 'Vencimento da parcela: ' end||to_char(target,'DD/MM/YYYY')||'. '||case when r.audience='issuer' then 'Entre em contato para organizar a renovação ou o pagamento. ' else 'Organize a renovação ou o pagamento com seu treinador. ' end||case when restriction is null then 'Sem restrição automática de acesso.' when restriction>p_today then 'Restrição prevista a partir de '||to_char(restriction,'DD/MM/YYYY')||', se continuar pendente.' else 'Confira a situação do acesso e do recebimento.' end;
  insert into public.prorun_billing_notices(user_id,membership_id,audience,kind,target_date,stage,subject_name,subject_type,title,message,restriction_date)
  values(r.user_id,r.id,r.audience,v_kind,target,v_stage,r.subject_name,r.subject_type,v_title,v_message,restriction)
  on conflict(user_id,membership_id,kind,target_date,stage) do update set resolved=false,title=excluded.title,message=excluded.message,restriction_date=excluded.restriction_date,subject_name=excluded.subject_name;
  total=total+1;
 end loop;
 end loop;
 return total;end $$;
revoke all on function prorun_private.refresh_billing_notices(uuid,date) from public,anon,authenticated;
grant execute on function prorun_private.refresh_billing_notices(uuid,date) to service_role;
create or replace function public.prorun_billing_refresh_notices(p_user uuid) returns integer language plpgsql security invoker set search_path='' as $$begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 return prorun_private.refresh_billing_notices(p_user);end $$;
revoke all on function public.prorun_billing_refresh_notices(uuid) from public,anon,authenticated;
grant execute on function public.prorun_billing_refresh_notices(uuid) to service_role;
notify pgrst,'reload schema';
create or replace function public.prorun_billing_issue_contract(p_member uuid,p_schedule jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare m public.prorun_memberships;item jsonb;total bigint;cnt integer;begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 select * into m from public.prorun_memberships where id=p_member for update;
 if m.id is null or m.plan_kind='recurring' then raise exception 'Contrato inválido';end if;
 select sum((value->>'amount_cents')::bigint),count(*) into total,cnt from jsonb_array_elements(p_schedule);
 if total<>m.amount_cents or (p_schedule->0->>'period_start')::date<>m.first_due_date or (p_schedule->(cnt-1)->>'period_end')::date<>m.contract_end then raise exception 'Parcelas inválidas';end if;
 for item in select value from jsonb_array_elements(p_schedule) loop
 insert into public.prorun_billing_invoices(membership_id,issuer_org_id,subject_name,amount_cents,period_start,period_end,due_date,contract_key,installment_number,installment_count,term_end)
 values(m.id,m.issuer_org_id,m.subject_name,(item->>'amount_cents')::int,(item->>'period_start')::date,(item->>'period_end')::date,(item->>'due_date')::date,m.contract_key,(item->>'installment_number')::int,cnt,m.contract_end)
 on conflict(membership_id,period_start) where status<>'cancelled' do nothing;
 end loop;
 return (select coalesce(jsonb_agg(i order by period_start),'[]'::jsonb) from public.prorun_billing_invoices i where membership_id=m.id and contract_key=m.contract_key and status<>'cancelled');end $$;
revoke all on function public.prorun_billing_issue_contract(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.prorun_billing_issue_contract(uuid,jsonb) to service_role;
-- Daily in-app reminders, independent of whether a coach opens the app that day.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
select cron.schedule('prorun-billing-reminders','0 12 * * *','select prorun_private.refresh_billing_notices();');
