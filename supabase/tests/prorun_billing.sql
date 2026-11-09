-- Run inside a transaction and roll back; no real balances or access are changed.
set local request.jwt.claims='{"role":"service_role"}';
do $$declare org uuid=gen_random_uuid();usr uuid=gen_random_uuid();aid text='billing-test-'||gen_random_uuid();m jsonb;i jsonb;ii jsonb;begin
 insert into public.prorun_organizations(id,name) values(org,'Billing verification');
 insert into auth.users(id,email) values(usr,usr||'@billing-test.invalid');
 insert into public.athletes(id,organization_id,data) values(aid,org,'{"name":"Billing verification"}');
 insert into public.prorun_accounts(user_id,organization_id,login,name,role,athlete_id) values(usr,org,usr::text,'Billing verification','athlete',aid);
 if not prorun_private.billing_allowed(usr) then raise exception 'Existing account was blocked';end if;
 m=public.prorun_billing_save_member(usr,jsonb_build_object('issuer_org_id',org,'subject_type','athlete','athlete_id',aid,'subject_name','Billing verification','amount_cents',15000,'months',1,'first_due_date',(now() at time zone 'America/Sao_Paulo')::date,'enabled',true,'grace_days',0));
 if prorun_private.billing_allowed(usr) then raise exception 'Unpaid enrollment allowed';end if;
 i=public.prorun_billing_issue((m->>'id')::uuid,(now() at time zone 'America/Sao_Paulo')::date,(now() at time zone 'America/Sao_Paulo')::date+29);
 ii=public.prorun_billing_issue((m->>'id')::uuid,(now() at time zone 'America/Sao_Paulo')::date,(now() at time zone 'America/Sao_Paulo')::date+29);
 if i->>'id'<>ii->>'id' then raise exception 'Duplicate invoice';end if;
 i=public.prorun_billing_receipt((i->>'id')::uuid,usr,'pix','Test manual');
 if i->>'status'<>'paid' or not prorun_private.billing_allowed(usr) then raise exception 'Manual receipt did not unlock';end if;
 begin perform public.prorun_billing_receipt((i->>'id')::uuid,usr,'pix','Duplicate');raise exception 'Duplicate manual receipt accepted';exception when others then if sqlerrm='Duplicate manual receipt accepted' then raise;end if;end;
 i=public.prorun_billing_correct((i->>'id')::uuid,usr,'reverse_manual','Correction');
 if prorun_private.billing_allowed(usr) then raise exception 'Correction did not revoke access';end if;
 i=public.prorun_billing_receipt((i->>'id')::uuid,null,'mercado_pago','','billing-test-provider','paid',now(),now());
 ii=public.prorun_billing_receipt((i->>'id')::uuid,null,'mercado_pago','','billing-test-provider','paid',now(),now());
 if (ii->>'paid_count')::int<>1 then raise exception 'Webhook duplicate counted twice';end if;
 i=public.prorun_billing_receipt((i->>'id')::uuid,null,'mercado_pago','','billing-test-provider','reversed',now()+interval '1 minute',now());
 i=public.prorun_billing_receipt((i->>'id')::uuid,null,'mercado_pago','','billing-test-provider','paid',now()-interval '1 minute',now());
 if i->>'status'<>'reversed' or prorun_private.billing_allowed(usr) then raise exception 'Stale webhook reactivated refund';end if;
 update public.prorun_memberships set complimentary_until=(now() at time zone 'America/Sao_Paulo')::date where id=(m->>'id')::uuid;
 if not prorun_private.billing_allowed(usr) then raise exception 'Courtesy did not unlock';end if;
 update public.prorun_memberships set complimentary_until=null,enabled=false where id=(m->>'id')::uuid;
 if not prorun_private.billing_allowed(usr) then raise exception 'Disabled enforcement blocked account';end if;
 -- Set authenticated JWT claims and assert helper/RLS enforce the same unpaid state.
 update public.prorun_memberships set enabled=true where id=(m->>'id')::uuid;
 perform set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',usr)::text,true);
 if prorun_private.billing_access() then raise exception 'RLS helper bypass';end if;
 execute 'set local role authenticated';
 if exists(select 1 from public.athletes where id=aid) then raise exception 'Expired user can read athlete data';end if;
 begin perform count(*) from public.prorun_billing_connections;raise exception 'Browser read secret table';exception when insufficient_privilege then null;end;
 execute 'reset role';
 update public.prorun_memberships set enabled=false where id=(m->>'id')::uuid;
 execute 'set local role authenticated';
 if not exists(select 1 from public.athletes where id=aid) then raise exception 'Renewed user cannot read own data';end if;
 if exists(select 1 from public.athletes where organization_id<>org) then raise exception 'Cross-tenant data exposed';end if;
 execute 'reset role';
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 -- Permission checks never grant billing secrets to browser roles.
 if has_table_privilege('authenticated','public.prorun_billing_connections','select') or has_table_privilege('authenticated','public.prorun_billing_settings','select') or has_function_privilege('authenticated','public.prorun_billing_receipt(uuid,uuid,text,text,text,text,timestamptz,timestamptz)','execute') then raise exception 'Billing secrets or writes exposed';end if;
end $$;
select 'billing transaction checks passed' as result;
