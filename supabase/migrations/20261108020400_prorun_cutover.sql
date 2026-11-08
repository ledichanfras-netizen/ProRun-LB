-- Run only after the authenticated app has been deployed and verified.
-- All previous records remain assigned to the original LB Sports organization.
do $$declare t text;p record;begin
 foreach t in array array['athletes','athlete_plans','workouts_library'] loop
  for p in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy %I on public.%I',p.policyname,t);end loop;
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
end $$;
create policy scoped_athlete_read on public.athletes for select to authenticated using((select prorun_private.is_admin()) or (organization_id=(select prorun_private.account_org()) and ((select prorun_private.is_coach()) or id=(select prorun_private.own_athlete()))));
create policy scoped_athlete_insert on public.athletes for insert to authenticated with check((select prorun_private.is_coach()) and (organization_id=(select prorun_private.account_org()) or (select prorun_private.is_admin())));
create policy scoped_athlete_update on public.athletes for update to authenticated using((select prorun_private.is_admin()) or (organization_id=(select prorun_private.account_org()) and ((select prorun_private.is_coach()) or id=(select prorun_private.own_athlete())))) with check((select prorun_private.is_admin()) or organization_id=(select prorun_private.account_org()));
create policy scoped_athlete_delete on public.athletes for delete to authenticated using((select prorun_private.is_coach()) and (organization_id=(select prorun_private.account_org()) or (select prorun_private.is_admin())));
create policy scoped_plan_read on public.athlete_plans for select to authenticated using(exists(select 1 from public.athletes a where a.id=athlete_id));
create policy scoped_plan_insert on public.athlete_plans for insert to authenticated with check(exists(select 1 from public.athletes a where a.id=athlete_id));
create policy scoped_plan_update on public.athlete_plans for update to authenticated using(exists(select 1 from public.athletes a where a.id=athlete_id)) with check(exists(select 1 from public.athletes a where a.id=athlete_id));
create policy scoped_plan_delete on public.athlete_plans for delete to authenticated using((select prorun_private.is_coach()) and exists(select 1 from public.athletes a where a.id=athlete_id));
create policy scoped_library_read on public.workouts_library for select to authenticated using(organization_id is null or organization_id=(select prorun_private.account_org()) or (select prorun_private.is_admin()));
create policy scoped_library_write on public.workouts_library for all to authenticated using((select prorun_private.is_coach()) and (organization_id=(select prorun_private.account_org()) or (select prorun_private.is_admin()))) with check((select prorun_private.is_coach()) and (organization_id=(select prorun_private.account_org()) or (select prorun_private.is_admin())));
-- Students can submit results, but cannot alter prescriptions, scores or another user's identity.
create or replace function prorun_private.guard_athlete_write() returns trigger language plpgsql set search_path='' as $$
declare allowed text[]=array['profilePhoto','name','birthDate','age','weight','height','phone','email','readiness','readinessHistory','lastReadiness','raceResults','gamification','organizationId'];
begin
 if current_user in('postgres','service_role') then return new;end if;
 if tg_op='UPDATE' and new.organization_id is distinct from old.organization_id and not prorun_private.is_admin() then raise exception 'Organization cannot change';end if;
 if not prorun_private.is_coach() and (new.id<>prorun_private.own_athlete() or new.data-allowed is distinct from old.data-allowed) then raise exception 'Only own profile and feedback may be edited';end if;
 return new;
end $$;
create trigger guard_athlete_write before update on public.athletes for each row execute function prorun_private.guard_athlete_write();
create or replace function prorun_private.guard_plan_write() returns trigger language plpgsql set search_path='' as $$
declare before_plan jsonb;after_plan jsonb;w jsonb;s jsonb;wi integer=0;di integer; fields text[]=array['completed','actualDistance','actualDuration','actualPace','actualHeartRate','actualCadence','rpe','notes','gpsRoute','completedAt','feedback','durationMinutes','avgHeartRate','sleepScore','stressScore','sorenessScore','moodScore','menstrualPhase','readinessScore'];
begin
 if current_user in('postgres','service_role') or prorun_private.is_coach() then return new;end if;
 if new.athlete_id<>prorun_private.own_athlete() then raise exception 'Forbidden';end if;
 before_plan=case when tg_op='INSERT' then '{"weeks":[]}'::jsonb else old.plan_data end;after_plan=new.plan_data;
 -- Aggregate volumes and gamification are derived client-side, never permission fields.
 before_plan=before_plan-array['freeRuns'];after_plan=after_plan-array['freeRuns'];
 for w in select value from jsonb_array_elements(coalesce(before_plan->'weeks','[]')) loop
  di=0;for s in select value from jsonb_array_elements(w->'workouts') loop
   if s-fields is distinct from (after_plan#>array['weeks',wi::text,'workouts',di::text])-fields then raise exception 'Prescription is read only';end if;
   di=di+1;
  end loop;
  if jsonb_array_length(after_plan#>array['weeks',wi::text,'workouts'])<>di then raise exception 'Prescription is read only';end if;
  before_plan=jsonb_set(before_plan,array['weeks',wi::text],w-array['workouts','actualVolume']);
  after_plan=jsonb_set(after_plan,array['weeks',wi::text],(after_plan#>array['weeks',wi::text])-array['workouts','actualVolume']);wi=wi+1;
 end loop;
 if before_plan is distinct from after_plan then raise exception 'Prescription is read only';end if;
 return new;
end $$;
create trigger guard_plan_write before insert or update on public.athlete_plans for each row execute function prorun_private.guard_plan_write();

drop policy if exists "Users can view own subscription" on public.subscriptions;
create policy scoped_subscription_read on public.subscriptions for select to authenticated using(user_id=(select auth.uid()) or athlete_id=(select prorun_private.own_athlete()) or ((select prorun_private.is_coach()) and exists(select 1 from public.athletes a where a.id=athlete_id)));
-- The previous hormonal access table is superseded by organization-bound accounts.
revoke all on public.cycle_access from anon,authenticated;
do $$declare p record;begin
 for p in select policyname from pg_policies where schemaname='public' and tablename='cycle_reports' loop execute format('drop policy %I on public.cycle_reports',p.policyname);end loop;
end $$;
revoke all on public.cycle_reports from anon;
grant select,insert,update,delete on public.cycle_reports to authenticated;
create policy scoped_cycle_reports on public.cycle_reports for all to authenticated using(exists(select 1 from public.athletes a where a.id=athlete_id)) with check(exists(select 1 from public.athletes a where a.id=athlete_id));
