create or replace function public.prorun_legacy_login(p_login text,p_password text) returns jsonb language plpgsql security definer set search_path='' as $$
declare item prorun_private.legacy_accounts; attempts integer;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 insert into prorun_private.login_attempts(login,attempts) values(lower(p_login),1)
 on conflict(login) do update set attempts=case when prorun_private.login_attempts.window_at<now()-interval '15 minutes' then 1 else prorun_private.login_attempts.attempts+1 end,window_at=case when prorun_private.login_attempts.window_at<now()-interval '15 minutes' then now() else prorun_private.login_attempts.window_at end returning login_attempts.attempts into attempts;
 if attempts>10 then return null;end if;
 select * into item from prorun_private.legacy_accounts where login=lower(p_login) and enabled;
 if item.role='athlete' then
  p_password=case when p_password~'^\d{4}-\d{2}-\d{2}$' then regexp_replace(p_password,'^(\d{4})-(\d{2})-(\d{2})$','\3\2\1') else regexp_replace(p_password,'\D','','g') end;
 end if;
 if item.id is null or extensions.crypt(p_password,item.password_hash)<>item.password_hash then return null;end if;
 return jsonb_build_object('id',item.id,'login',item.login,'name',item.name,'organization_id',item.organization_id,'role',item.role,'platform_admin',item.platform_admin,'athlete_id',item.athlete_id);
end $$;
revoke all on function public.prorun_legacy_login(text,text) from public,anon,authenticated;
grant execute on function public.prorun_legacy_login(text,text) to service_role;
