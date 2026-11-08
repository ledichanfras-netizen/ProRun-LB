create or replace function public.prorun_login_allowed(p_login text) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 insert into prorun_private.login_attempts(login,attempts) values(lower(p_login),1)
 on conflict(login) do update set attempts=case when prorun_private.login_attempts.window_at<now()-interval '15 minutes' then 1 else prorun_private.login_attempts.attempts+1 end,window_at=case when prorun_private.login_attempts.window_at<now()-interval '15 minutes' then now() else prorun_private.login_attempts.window_at end returning login_attempts.attempts into n;
 return n<=10;
end $$;
revoke all on function public.prorun_login_allowed(text) from public,anon,authenticated;
grant execute on function public.prorun_login_allowed(text) to service_role;
