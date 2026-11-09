-- Compare and write atomically without putting large plan JSON in a REST URL.
-- SECURITY INVOKER keeps existing account, athlete and plan RLS in force.
create or replace function public.prorun_import_write(p_athlete_id text,p_expected jsonb,p_next jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare affected integer;
begin
 if not exists(select 1 from public.prorun_accounts a where a.user_id=(select auth.uid()) and a.active and a.role='coach' and not a.must_change_password) then
  raise exception 'Importação disponível somente ao treinador' using errcode='42501';
 end if;
 if not exists(select 1 from public.athletes a where a.id=p_athlete_id) then
  raise exception 'Aluno fora do seu acesso' using errcode='42501';
 end if;
 if p_next is null or jsonb_typeof(p_next)<>'object' or jsonb_typeof(p_next->'weeks') is distinct from 'array' then
  raise exception 'Programação inválida' using errcode='22023';
 end if;
 if p_expected is null then
  insert into public.athlete_plans(athlete_id,plan_data) values(p_athlete_id,p_next) on conflict(athlete_id) do nothing;
 else
  update public.athlete_plans set plan_data=p_next where athlete_id=p_athlete_id and plan_data=p_expected;
 end if;
 get diagnostics affected=row_count;
 return affected=1;
end;
$$;
revoke all on function public.prorun_import_write(text,jsonb,jsonb) from public,anon;
grant execute on function public.prorun_import_write(text,jsonb,jsonb) to authenticated;
