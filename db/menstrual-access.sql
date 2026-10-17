BEGIN;
CREATE SCHEMA IF NOT EXISTS prorun_private;
REVOKE ALL ON SCHEMA prorun_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.cycle_access (
  email text PRIMARY KEY CHECK (email=lower(trim(email))),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('coach','athlete')),
  athlete_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((role='coach' AND athlete_id IS NULL) OR (role='athlete' AND athlete_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS cycle_one_coach ON public.cycle_access(role) WHERE role='coach';
CREATE INDEX IF NOT EXISTS cycle_access_user ON public.cycle_access(user_id);
ALTER TABLE public.cycle_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cycle_access FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.cycle_access TO authenticated;
CREATE POLICY cycle_access_self ON public.cycle_access FOR SELECT TO authenticated USING(user_id=(select auth.uid()));
-- A private, non-exposed helper avoids recursion in the enrollment INSERT policy.
-- It only checks auth.uid(); the caller cannot nominate another identity.
CREATE OR REPLACE FUNCTION prorun_private.is_cycle_coach() RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
 RETURN EXISTS(SELECT 1 FROM public.cycle_access WHERE user_id=auth.uid() AND role='coach');
END $$;
REVOKE ALL ON FUNCTION prorun_private.is_cycle_coach() FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA prorun_private TO authenticated;
GRANT EXECUTE ON FUNCTION prorun_private.is_cycle_coach() TO authenticated;
CREATE POLICY cycle_coach_invites ON public.cycle_access FOR INSERT TO authenticated WITH CHECK (
 role='athlete' AND athlete_id IS NOT NULL AND (select prorun_private.is_cycle_coach())
);

-- Only verified Auth identities can claim an authorized email. Public profile edits never grant access.
CREATE OR REPLACE FUNCTION prorun_private.bind_cycle_access() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_TABLE_SCHEMA='auth' THEN
   UPDATE public.cycle_access SET user_id=NULL WHERE user_id=NEW.id AND (NEW.email_confirmed_at IS NULL OR email IS DISTINCT FROM lower(NEW.email));
   IF NEW.email_confirmed_at IS NOT NULL THEN
     UPDATE public.cycle_access SET user_id=NEW.id WHERE email=lower(NEW.email);
   END IF;
 ELSE
   NEW.email:=lower(trim(NEW.email));
   NEW.user_id:=(SELECT id FROM auth.users WHERE lower(email)=NEW.email AND email_confirmed_at IS NOT NULL LIMIT 1);
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION prorun_private.bind_cycle_access() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER cycle_identity_verified AFTER INSERT OR UPDATE OF email,email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION prorun_private.bind_cycle_access();
CREATE TRIGGER cycle_enrollment_verified BEFORE INSERT ON public.cycle_access FOR EACH ROW EXECUTE FUNCTION prorun_private.bind_cycle_access();

CREATE TABLE IF NOT EXISTS public.cycle_reports (
 athlete_id text NOT NULL REFERENCES public.cycle_access(athlete_id),
 date date NOT NULL,
 report jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(report)='object' AND octet_length(report::text)<12000),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(athlete_id,date)
);
ALTER TABLE public.cycle_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cycle_reports FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.cycle_reports TO authenticated;
CREATE POLICY cycle_report_read ON public.cycle_reports FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.cycle_access me WHERE me.user_id=(select auth.uid()) AND (me.role='coach' OR me.athlete_id=cycle_reports.athlete_id)));
CREATE POLICY cycle_report_insert ON public.cycle_reports FOR INSERT TO authenticated WITH CHECK(EXISTS(SELECT 1 FROM public.cycle_access me WHERE me.user_id=(select auth.uid()) AND (me.role='coach' OR me.athlete_id=cycle_reports.athlete_id)));
CREATE POLICY cycle_report_update ON public.cycle_reports FOR UPDATE TO authenticated USING(EXISTS(SELECT 1 FROM public.cycle_access me WHERE me.user_id=(select auth.uid()) AND (me.role='coach' OR me.athlete_id=cycle_reports.athlete_id))) WITH CHECK(EXISTS(SELECT 1 FROM public.cycle_access me WHERE me.user_id=(select auth.uid()) AND (me.role='coach' OR me.athlete_id=cycle_reports.athlete_id)));
CREATE POLICY cycle_report_delete ON public.cycle_reports FOR DELETE TO authenticated USING(EXISTS(SELECT 1 FROM public.cycle_access me WHERE me.user_id=(select auth.uid()) AND (me.role='coach' OR me.athlete_id=cycle_reports.athlete_id)));

-- Prevent old clients from publishing cycle fields inside the legacy shared JSON records.
CREATE OR REPLACE FUNCTION prorun_private.strip_cycle_json(value jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF jsonb_typeof(value)='object' THEN
   SELECT coalesce(jsonb_object_agg(key,prorun_private.strip_cycle_json(val)),'{}'::jsonb) INTO result FROM jsonb_each(value) AS e(key,val) WHERE lower(key) NOT LIKE 'menstrual%';
   RETURN result;
 ELSIF jsonb_typeof(value)='array' THEN
   SELECT coalesce(jsonb_agg(prorun_private.strip_cycle_json(val) ORDER BY ord),'[]'::jsonb) INTO result FROM jsonb_array_elements(value) WITH ORDINALITY AS e(val,ord);
   RETURN result;
 END IF;
 RETURN value;
END $$;
REVOKE ALL ON FUNCTION prorun_private.strip_cycle_json(jsonb) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION prorun_private.guard_cycle_json() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_TABLE_NAME='athletes' THEN NEW.data:=prorun_private.strip_cycle_json(NEW.data::jsonb);
 ELSE NEW.plan_data:=prorun_private.strip_cycle_json(NEW.plan_data::jsonb); END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION prorun_private.guard_cycle_json() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_athlete_cycle_json BEFORE INSERT OR UPDATE OF data ON public.athletes FOR EACH ROW EXECUTE FUNCTION prorun_private.guard_cycle_json();
CREATE TRIGGER protect_plan_cycle_json BEFORE INSERT OR UPDATE OF plan_data ON public.athlete_plans FOR EACH ROW EXECUTE FUNCTION prorun_private.guard_cycle_json();

-- The only coach account for this release. Students are authorized individually by this coach.
INSERT INTO public.cycle_access(email,role) VALUES ('ledichanfras@gmail.com','coach');
NOTIFY pgrst,'reload schema';
COMMIT;
