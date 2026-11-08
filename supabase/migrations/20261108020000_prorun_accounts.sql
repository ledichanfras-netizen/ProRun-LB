-- Account infrastructure is additive. Legacy RLS is closed in the separate cutover migration.
create schema if not exists prorun_private;
revoke all on schema prorun_private from public,anon,authenticated;
create table if not exists public.prorun_organizations(id uuid primary key default gen_random_uuid(),name text not null,created_at timestamptz not null default now());
create table if not exists public.prorun_accounts(
 user_id uuid primary key references auth.users(id) on delete cascade,
 organization_id uuid not null references public.prorun_organizations(id),
 login text not null unique,name text not null,role text not null check(role in('coach','athlete')),
 platform_admin boolean not null default false,athlete_id text references public.athletes(id),
 active boolean not null default true,must_change_password boolean not null default false,
 check((role='athlete' and athlete_id is not null and not platform_admin) or (role='coach' and athlete_id is null))
);
create unique index if not exists prorun_one_athlete_account on public.prorun_accounts(athlete_id) where athlete_id is not null;
create table if not exists public.prorun_invitations(
 id uuid primary key default gen_random_uuid(),token_hash text not null unique,
 organization_id uuid not null references public.prorun_organizations(id),email text not null,name text not null,
 role text not null check(role in('coach','athlete')),athlete_id text references public.athletes(id),
 account_id uuid references public.prorun_accounts(user_id),created_by uuid not null references public.prorun_accounts(user_id),
 expires_at timestamptz not null default now()+interval '7 days',accepted_at timestamptz,
 check((role='athlete' and athlete_id is not null)or(role='coach' and athlete_id is null))
);
create table if not exists prorun_private.legacy_accounts(
 id uuid primary key default gen_random_uuid(),login text not null unique,name text not null,
 password_hash text not null,organization_id uuid not null references public.prorun_organizations(id),
 role text not null,platform_admin boolean not null default false,athlete_id text,enabled boolean not null default true
);
create table if not exists prorun_private.login_attempts(login text primary key,window_at timestamptz not null default now(),attempts integer not null default 0);
create or replace function prorun_private.account_org() returns uuid language sql stable security definer set search_path='' as $$
 select organization_id from public.prorun_accounts where user_id=auth.uid() and active and not must_change_password
$$;
create or replace function prorun_private.is_coach() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.prorun_accounts where user_id=auth.uid() and active and not must_change_password and role='coach')
$$;
create or replace function prorun_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.prorun_accounts where user_id=auth.uid() and active and not must_change_password and platform_admin)
$$;
create or replace function prorun_private.own_athlete() returns text language sql stable security definer set search_path='' as $$
 select athlete_id from public.prorun_accounts where user_id=auth.uid() and active and not must_change_password and role='athlete'
$$;
grant usage on schema prorun_private to authenticated;
revoke all on all functions in schema prorun_private from public,anon;
grant execute on function prorun_private.account_org(),prorun_private.is_coach(),prorun_private.is_admin(),prorun_private.own_athlete() to authenticated;
alter table public.prorun_organizations enable row level security;
alter table public.prorun_accounts enable row level security;
alter table public.prorun_invitations enable row level security;
revoke all on public.prorun_accounts,public.prorun_organizations,public.prorun_invitations from anon,authenticated;
grant select on public.prorun_accounts,public.prorun_organizations to authenticated;
grant all on public.prorun_accounts,public.prorun_organizations,public.prorun_invitations to service_role;
create policy self_account on public.prorun_accounts for select to authenticated using(user_id=(select auth.uid()));
create policy own_organization on public.prorun_organizations for select to authenticated using(id=(select prorun_private.account_org()) or (select prorun_private.is_admin()));
-- Service-only compatibility checks migrate existing usernames without exposing athlete lists.
create or replace function public.prorun_legacy_login(p_login text,p_password text) returns jsonb language plpgsql security definer set search_path='' as $$
declare item prorun_private.legacy_accounts; attempts integer;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 insert into prorun_private.login_attempts(login,attempts) values(lower(p_login),1)
 on conflict(login) do update set attempts=case when prorun_private.login_attempts.window_at<now()-interval '15 minutes' then 1 else prorun_private.login_attempts.attempts+1 end,window_at=case when prorun_private.login_attempts.window_at<now()-interval '15 minutes' then now() else prorun_private.login_attempts.window_at end returning login_attempts.attempts into attempts;
 if attempts>10 then return null;end if;
 select * into item from prorun_private.legacy_accounts where login=lower(p_login) and enabled;
 if item.id is null or extensions.crypt(p_password,item.password_hash)<>item.password_hash then return null;end if;
 return jsonb_build_object('id',item.id,'login',item.login,'name',item.name,'organization_id',item.organization_id,'role',item.role,'platform_admin',item.platform_admin,'athlete_id',item.athlete_id);
end $$;
revoke all on function public.prorun_legacy_login(text,text) from public,anon,authenticated;
grant execute on function public.prorun_legacy_login(text,text) to service_role;
create or replace function public.prorun_disable_legacy(p_login text) returns void language plpgsql security definer set search_path='' as $$
begin if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;update prorun_private.legacy_accounts set enabled=false where login=p_login;end $$;
revoke all on function public.prorun_disable_legacy(text) from public,anon,authenticated;
grant execute on function public.prorun_disable_legacy(text) to service_role;
insert into public.prorun_organizations(id,name) values('ae4c9185-8c85-46fb-8d30-279248221957','LB Sports · Prof. Leandro') on conflict(id) do nothing;
alter table public.athletes add column if not exists organization_id uuid not null default 'ae4c9185-8c85-46fb-8d30-279248221957' references public.prorun_organizations(id);
alter table public.workouts_library add column if not exists organization_id uuid references public.prorun_organizations(id);
create index if not exists prorun_athlete_org on public.athletes(organization_id);
create index if not exists prorun_account_org on public.prorun_accounts(organization_id);
create index if not exists prorun_library_org on public.workouts_library(organization_id);
-- Password hashes only, using the same legacy credentials accepted by the previous app.
insert into prorun_private.legacy_accounts(login,name,password_hash,organization_id,role,platform_admin)
values('leandro','Prof. Leandro',extensions.crypt('1234',extensions.gen_salt('bf')),'ae4c9185-8c85-46fb-8d30-279248221957','coach',true) on conflict(login) do nothing;
insert into prorun_private.legacy_accounts(login,name,password_hash,organization_id,role,athlete_id)
select lower(translate(trim(data->>'name'),'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç','AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc')),data->>'name',extensions.crypt(to_char((data->>'birthDate')::date,'DDMMYYYY'),extensions.gen_salt('bf')),organization_id,'athlete',id from public.athletes where data->>'birthDate'~'^\d{4}-\d{2}-\d{2}$' on conflict(login) do nothing;
notify pgrst,'reload schema';
