create or replace function prorun_private.guard_plan_write() returns trigger language plpgsql set search_path='' as $$
declare before_plan jsonb;after_plan jsonb;w jsonb;s jsonb;wi integer=0;di integer; fields text[]=array['completed','actualDistance','actualDuration','actualPace','actualHeartRate','actualCadence','rpe','notes','gpsRoute','completedAt','feedback','durationMinutes','avgHeartRate','sleepScore','stressScore','sorenessScore','moodScore','menstrualPhase','readinessScore'];
begin
 if current_user in('postgres','service_role') or prorun_private.is_coach() then return new;end if;
 if new.athlete_id<>prorun_private.own_athlete() then raise exception 'Forbidden';end if;
 -- BEFORE INSERT also runs for ON CONFLICT updates. Compare with the persisted
 -- plan when present; an upsert must not be mistaken for a new prescription.
 if tg_op='INSERT' then
  select p.plan_data into before_plan from public.athlete_plans p where p.athlete_id=new.athlete_id;
  before_plan=coalesce(before_plan,'{"weeks":[]}'::jsonb);
 else before_plan=old.plan_data;end if;
 after_plan=new.plan_data;
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
