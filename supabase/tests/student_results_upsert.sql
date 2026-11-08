-- Run with a database owner on a populated staging database. All writes roll back.
begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',a.user_id,'role','authenticated')::text,true)
from public.prorun_accounts a join public.athlete_plans p on p.athlete_id=a.athlete_id
where a.role='athlete' and a.active and not a.must_change_password
and jsonb_array_length(p.plan_data->'weeks')>0 limit 1;
set local role authenticated;
do $$declare p jsonb;begin
 select plan_data into p from public.athlete_plans where athlete_id=prorun_private.own_athlete();
 if p is null then raise exception 'A populated athlete fixture is required';end if;
 insert into public.athlete_plans(athlete_id,plan_data) values(prorun_private.own_athlete(),p)
 on conflict(athlete_id) do update set plan_data=excluded.plan_data;
 p=jsonb_set(p,'{weeks,0,workouts,0}',(p#>'{weeks,0,workouts,0}')||'{"completed":true,"rpe":5,"actualDistance":8.123,"actualDuration":"45:00","feedback":"rollback verification","gpsRoute":{"points":[]}}');
 insert into public.athlete_plans(athlete_id,plan_data) values(prorun_private.own_athlete(),p)
 on conflict(athlete_id) do update set plan_data=excluded.plan_data;
 p=jsonb_set(p,'{freeRuns}',coalesce(p->'freeRuns','[]')||'[{"id":"rollback-verification","actualDistance":2,"rpe":3}]');
 insert into public.athlete_plans(athlete_id,plan_data) values(prorun_private.own_athlete(),p)
 on conflict(athlete_id) do update set plan_data=excluded.plan_data;
 begin
  insert into public.athlete_plans(athlete_id,plan_data)
  values(prorun_private.own_athlete(),jsonb_set(p,'{weeks,0,workouts,0,distance}','999'))
  on conflict(athlete_id) do update set plan_data=excluded.plan_data;
  raise exception 'Prescription edit incorrectly allowed';
 exception when raise_exception then if sqlerrm<>'Prescription is read only' then raise;end if;end;
 if exists(select 1 from public.athlete_plans where athlete_id<>prorun_private.own_athlete()) then raise exception 'Foreign plan visible';end if;
end$$;
rollback;
