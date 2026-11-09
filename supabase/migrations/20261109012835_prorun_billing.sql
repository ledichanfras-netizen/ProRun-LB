-- No existing account is enrolled or blocked by this migration.
create table public.prorun_memberships (
 id uuid primary key default gen_random_uuid(), issuer_org_id uuid not null references public.prorun_organizations(id),
 subject_type text not null check(subject_type in('athlete','coach')), athlete_id text references public.athletes(id), coach_user_id uuid references public.prorun_accounts(user_id),
 subject_name text not null, amount_cents integer not null check(amount_cents between 100 and 10000000), months integer not null check(months in(1,3,6,12)),
 first_due_date date not null, enabled boolean not null default false, grace_days integer not null default 0 check(grace_days between 0 and 30), complimentary_until date,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check((subject_type='athlete' and athlete_id is not null and coach_user_id is null) or(subject_type='coach' and coach_user_id is not null and athlete_id is null))
);
create unique index prorun_membership_athlete on public.prorun_memberships(athlete_id) where athlete_id is not null;
create unique index prorun_membership_coach on public.prorun_memberships(coach_user_id) where coach_user_id is not null;
create index prorun_membership_issuer on public.prorun_memberships(issuer_org_id);
create table public.prorun_billing_invoices (
 id uuid primary key default gen_random_uuid(),membership_id uuid not null references public.prorun_memberships(id),issuer_org_id uuid not null references public.prorun_organizations(id),
 subject_name text not null,amount_cents integer not null check(amount_cents between 100 and 10000000),period_start date not null,period_end date not null,due_date date not null,
 status text not null default 'pending' check(status in('pending','paid','cancelled','reversed')),checkout_url text,provider_preference_id text,
 paid_at timestamptz,paid_method text,paid_count integer not null default 0,created_at timestamptz not null default now(),
 check(period_end>=period_start)
);
create unique index prorun_active_invoice_period on public.prorun_billing_invoices(membership_id,period_start) where status<>'cancelled';
create index prorun_invoice_issuer on public.prorun_billing_invoices(issuer_org_id);
create table public.prorun_billing_payments (
 id uuid primary key default gen_random_uuid(),invoice_id uuid not null references public.prorun_billing_invoices(id),method text not null,
 amount_cents integer not null,status text not null check(status in('paid','reversed','pending')),provider_payment_id text unique,
 provider_updated_at timestamptz,paid_at timestamptz,recorded_by uuid references auth.users(id),note text not null default '',created_at timestamptz not null default now()
);
create index prorun_payment_invoice on public.prorun_billing_payments(invoice_id);
create unique index prorun_manual_receipt on public.prorun_billing_payments(invoice_id) where provider_payment_id is null and status='paid';
create table public.prorun_billing_events (
 id bigint generated always as identity primary key,actor_id uuid references auth.users(id),invoice_id uuid references public.prorun_billing_invoices(id),membership_id uuid references public.prorun_memberships(id),
 event text not null,details jsonb not null default '{}',created_at timestamptz not null default now()
);
create index prorun_billing_event_invoice on public.prorun_billing_events(invoice_id);
create index prorun_billing_event_member on public.prorun_billing_events(membership_id);
-- Secrets are never readable/writable with browser roles. Only the authenticated Edge backend uses them.
create table public.prorun_billing_settings(id boolean primary key default true check(id),client_id text not null,client_secret text not null,webhook_secret text not null,updated_at timestamptz not null default now());
create table public.prorun_billing_connections(organization_id uuid primary key references public.prorun_organizations(id),collector_id text not null,access_token text not null,refresh_token text not null,expires_at timestamptz not null,connected_by uuid not null references auth.users(id),updated_at timestamptz not null default now());
create table public.prorun_billing_oauth(state_hash text primary key,user_id uuid not null references auth.users(id),organization_id uuid not null references public.prorun_organizations(id),verifier text not null,expires_at timestamptz not null,consumed_at timestamptz);
create index prorun_billing_oauth_user on public.prorun_billing_oauth(user_id);
do $$declare t text;begin
 foreach t in array array['prorun_memberships','prorun_billing_invoices','prorun_billing_payments','prorun_billing_events','prorun_billing_settings','prorun_billing_connections','prorun_billing_oauth'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('create policy service_only_billing on public.%I for all to anon,authenticated using(false) with check(false)',t);
 end loop;
end $$;
grant usage,select on sequence public.prorun_billing_events_id_seq to service_role;
-- Membership and invoice writes are transactions so audit and state cannot diverge.
create or replace function public.prorun_billing_save_member(p_actor uuid,p_member jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result public.prorun_memberships;begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 if p_member->>'id' is null then
 insert into public.prorun_memberships(issuer_org_id,subject_type,athlete_id,coach_user_id,subject_name,amount_cents,months,first_due_date,enabled,grace_days,complimentary_until)
 values((p_member->>'issuer_org_id')::uuid,p_member->>'subject_type',p_member->>'athlete_id',(p_member->>'coach_user_id')::uuid,p_member->>'subject_name',(p_member->>'amount_cents')::int,(p_member->>'months')::int,(p_member->>'first_due_date')::date,(p_member->>'enabled')::boolean,(p_member->>'grace_days')::int,(p_member->>'complimentary_until')::date) returning * into result;
 else
 update public.prorun_memberships set amount_cents=(p_member->>'amount_cents')::int,months=(p_member->>'months')::int,enabled=(p_member->>'enabled')::boolean,grace_days=(p_member->>'grace_days')::int,complimentary_until=(p_member->>'complimentary_until')::date,updated_at=now() where id=(p_member->>'id')::uuid returning * into result;
 if result.id is null then raise exception 'Membership not found';end if;
 end if;
 insert into public.prorun_billing_events(actor_id,membership_id,event,details) values(p_actor,result.id,'membership_saved',jsonb_build_object('enabled',result.enabled,'amount_cents',result.amount_cents,'months',result.months,'grace_days',result.grace_days,'complimentary_until',result.complimentary_until));
 return to_jsonb(result);end $$;
create or replace function public.prorun_billing_receipt(p_invoice uuid,p_actor uuid,p_method text,p_note text,p_provider_id text default null,p_state text default 'paid',p_updated timestamptz default null,p_paid_at timestamptz default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare item public.prorun_billing_invoices;previous public.prorun_billing_payments;cnt integer;latest timestamptz;v_method text;begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 select * into item from public.prorun_billing_invoices where id=p_invoice for update;
 if item.id is null or item.status='cancelled' then raise exception 'Cobrança indisponível';end if;
 if p_provider_id is null then
 if p_method not in('pix','dinheiro','transferencia','cartao','outro') or p_state<>'paid' or item.status='paid' then raise exception 'Recebimento inválido ou já confirmado';end if;
 insert into public.prorun_billing_payments(invoice_id,method,amount_cents,status,recorded_by,note,paid_at) values(item.id,p_method,item.amount_cents,'paid',p_actor,left(p_note,500),coalesce(p_paid_at,now()));
 else
 select * into previous from public.prorun_billing_payments where provider_payment_id=p_provider_id;
 if previous.id is not null and (previous.invoice_id<>item.id or previous.provider_updated_at>=p_updated) then return to_jsonb(item);end if;
 insert into public.prorun_billing_payments(invoice_id,method,amount_cents,status,provider_payment_id,provider_updated_at,paid_at)
 values(item.id,'mercado_pago',item.amount_cents,p_state,p_provider_id,p_updated,p_paid_at)
 on conflict(provider_payment_id) do update set status=excluded.status,provider_updated_at=excluded.provider_updated_at,paid_at=excluded.paid_at;
 end if;
 select count(*),max(paid_at) into cnt,latest from public.prorun_billing_payments where invoice_id=item.id and status='paid';
 select p.method into v_method from public.prorun_billing_payments p where invoice_id=item.id and status='paid' order by paid_at desc limit 1;
 update public.prorun_billing_invoices set status=case when cnt>0 then 'paid' when exists(select 1 from public.prorun_billing_payments where invoice_id=item.id and status='reversed') then 'reversed' else 'pending' end,paid_count=cnt,paid_at=latest,paid_method=v_method where id=item.id returning * into item;
 insert into public.prorun_billing_events(actor_id,invoice_id,event,details) values(p_actor,item.id,case when p_provider_id is null then 'manual_receipt' else 'provider_sync' end,jsonb_build_object('method',p_method,'state',p_state,'provider_id',p_provider_id,'note',left(p_note,500)));
 return to_jsonb(item);end $$;
-- RLS checks the current date on every request, including previously issued JWTs.
create or replace function prorun_private.billing_allowed(p_user uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.prorun_accounts a where a.user_id=p_user and a.active and not a.must_change_password and (
 a.platform_admin or not exists(select 1 from public.prorun_memberships m where m.enabled and ((a.role='athlete' and m.athlete_id=a.athlete_id) or(a.role='coach' and m.coach_user_id=a.user_id))
 and not (coalesce(m.complimentary_until>=(now() at time zone 'America/Sao_Paulo')::date,false) or exists(select 1 from public.prorun_billing_invoices i where i.membership_id=m.id and i.status='paid' and i.period_start<=(now() at time zone 'America/Sao_Paulo')::date and i.period_end+m.grace_days>=(now() at time zone 'America/Sao_Paulo')::date)))
 ))
$$;
revoke all on function prorun_private.billing_allowed(uuid) from public,anon,authenticated;
grant usage on schema prorun_private to service_role;
grant execute on function prorun_private.billing_allowed(uuid) to service_role;
create or replace function prorun_private.billing_access() returns boolean language sql stable security definer set search_path='' as $$select prorun_private.billing_allowed(auth.uid())$$;
create or replace function public.prorun_billing_check(p_user uuid) returns boolean language plpgsql stable security invoker set search_path='' as $$begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 return prorun_private.billing_allowed(p_user);end $$;
revoke all on function public.prorun_billing_check(uuid) from public,anon,authenticated;
grant execute on function public.prorun_billing_check(uuid) to service_role;
revoke all on function prorun_private.billing_access() from public,anon;
grant execute on function prorun_private.billing_access() to authenticated;
do $$declare t text;begin
 foreach t in array array['athletes','athlete_plans','workouts_library','cycle_reports'] loop
 execute format('create policy billing_entitlement on public.%I as restrictive for all to authenticated using((select prorun_private.billing_access())) with check((select prorun_private.billing_access()))',t);
 end loop;
end $$;
revoke all on function public.prorun_billing_save_member(uuid,jsonb),public.prorun_billing_receipt(uuid,uuid,text,text,text,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.prorun_billing_save_member(uuid,jsonb),public.prorun_billing_receipt(uuid,uuid,text,text,text,text,timestamptz,timestamptz) to service_role;
notify pgrst,'reload schema';

create or replace function public.prorun_billing_issue(p_member uuid,p_start date,p_end date) returns jsonb language plpgsql security invoker set search_path='' as $$
declare m public.prorun_memberships;i public.prorun_billing_invoices;begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 select * into m from public.prorun_memberships where id=p_member for update;
 if m.id is null or p_start is null or p_end<p_start then raise exception 'Período inválido';end if;
 select * into i from public.prorun_billing_invoices where membership_id=m.id and status<>'cancelled' and (status in('pending','reversed') or (period_start<=p_end and period_end>=p_start)) order by period_start desc limit 1;
 if i.id is not null then return to_jsonb(i);end if;
 insert into public.prorun_billing_invoices(membership_id,issuer_org_id,subject_name,amount_cents,period_start,period_end,due_date) values(m.id,m.issuer_org_id,m.subject_name,m.amount_cents,p_start,p_end,p_start) returning * into i;
 insert into public.prorun_billing_events(membership_id,invoice_id,event) values(m.id,i.id,'invoice_issued');return to_jsonb(i);end $$;
create or replace function public.prorun_billing_correct(p_invoice uuid,p_actor uuid,p_action text,p_note text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare i public.prorun_billing_invoices;begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 select * into i from public.prorun_billing_invoices where id=p_invoice for update;
 if i.id is null then raise exception 'Cobrança indisponível';end if;
 if p_action='cancel' then
 if i.status<>'pending' or i.provider_preference_id is not null or exists(select 1 from public.prorun_billing_payments where invoice_id=i.id) then raise exception 'Somente cobrança sem pagamento ou checkout pode ser cancelada';end if;
 update public.prorun_billing_invoices set status='cancelled' where id=i.id returning * into i;
 elsif p_action='reverse_manual' then
 if i.paid_count<>1 or i.paid_method='mercado_pago' or i.status<>'paid' then raise exception 'Recebimento indisponível para correção';end if;
 update public.prorun_billing_payments set status='reversed' where invoice_id=i.id and provider_payment_id is null and status='paid';
 update public.prorun_billing_invoices set status='reversed',paid_count=0,paid_at=null,paid_method=null where id=i.id returning * into i;
 else raise exception 'Ação inválida';end if;
 insert into public.prorun_billing_events(actor_id,invoice_id,event,details) values(p_actor,i.id,p_action,jsonb_build_object('note',left(p_note,500)));return to_jsonb(i);end $$;
revoke all on function public.prorun_billing_issue(uuid,date,date),public.prorun_billing_correct(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.prorun_billing_issue(uuid,date,date),public.prorun_billing_correct(uuid,uuid,text,text) to service_role;

create index prorun_billing_connection_author on public.prorun_billing_connections(connected_by);
create index prorun_billing_event_actor on public.prorun_billing_events(actor_id);
create index prorun_billing_oauth_org on public.prorun_billing_oauth(organization_id);
create index prorun_billing_payment_author on public.prorun_billing_payments(recorded_by);
