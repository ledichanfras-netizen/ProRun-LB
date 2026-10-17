-- Keep the existing app login and save optional cycle fields with readiness.
-- The previously protected cycle tables and their policies remain unchanged.
DROP TRIGGER IF EXISTS protect_athlete_cycle_json ON public.athletes;
