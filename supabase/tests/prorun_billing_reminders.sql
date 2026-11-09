-- Always run in a transaction and roll back. Never persists test people or financial entries.
set local request.jwt.claims='{"role":"service_role"}';
do $$declare org uuid=gen_random_uuid();other_org uuid=gen_random_uuid();coach uuid=gen_random_uuid();student uuid=gen_random_uuid();outsider uuid=gen_random_uuid();aid text='reminder-rollback-'||gen_random_uuid();m jsonb;i uuid;member uuid;first_notice uuid;total integer;n integer;begin
 insert into public.prorun_organizations(id,name) values(org,'Rollback test'),(other_org,'Rollback other');
 insert into auth.users(id,email) values(coach,coach||'@rollback.invalid'),(student,student||'@rollback.invalid'),(outsider,outsider||'@rollback.invalid');
 insert into public.athletes(id,organization_id,data) values(aid,org,'{"name":"Rollback test"}');
 insert into public.prorun_accounts(user_id,organization_id,login,name,role,athlete_id) values(coach,org,coach::text,'Coach rollback','coach',null),(student,org,student::text,'Student rollback','athlete',aid),(outsider,other_org,outsider::text,'Other coach','coach',null);
 m=public.prorun_billing_save_v2(coach,jsonb_build_object('issuer_org_id',org,'subject_type','athlete','athlete_id',aid,'subject_name','Rollback test','amount_cents',10001,'months',3,'first_due_date','2026-11-01','enabled',true,'grace_days',3,'plan_kind','contract','payment_schedule','monthly','contract_end','2027-01-31'),
 '[{"period_start":"2026-11-01","period_end":"2026-11-30","due_date":"2026-11-01","amount_cents":3334,"installment_number":1},{"period_start":"2026-12-01","period_end":"2026-12-31","due_date":"2026-12-01","amount_cents":3334,"installment_number":2},{"period_start":"2027-01-01","period_end":"2027-01-31","due_date":"2027-01-01","amount_cents":3333,"installment_number":3}]');
 member=(m->>'id')::uuid;
 select sum(amount_cents),count(*) into total,n from public.prorun_billing_invoices where membership_id=member;
 if total<>10001 or n<>3 then raise exception 'Installment total mismatch';end if;
 select id into i from public.prorun_billing_invoices where membership_id=member and installment_number=1;
 perform public.prorun_billing_receipt(i,coach,'pix','Rollback verification');
 perform prorun_private.refresh_billing_notices(coach,'2026-11-24');
 select id into first_notice from public.prorun_billing_notices where user_id=coach and not resolved and stage=7;
 if first_notice is null then raise exception 'Seven day notice missing';end if;
 update public.prorun_billing_notices set read=true where id=first_notice;
 perform prorun_private.refresh_billing_notices(coach,'2026-11-25');
 if not exists(select 1 from public.prorun_billing_notices where id=first_notice and read and not resolved) then raise exception 'Repeated access duplicated or unread notice';end if;
 perform prorun_private.refresh_billing_notices(coach,'2026-11-28');
 if (select count(*) from public.prorun_billing_notices where user_id=coach and not resolved)<>1 or not exists(select 1 from public.prorun_billing_notices where user_id=coach and not resolved and stage=3) then raise exception 'Three day transition failed';end if;
 perform prorun_private.refresh_billing_notices(coach,'2026-11-30');
 if not exists(select 1 from public.prorun_billing_notices where user_id=coach and not resolved and stage=1) then raise exception 'One day transition failed';end if;
 perform prorun_private.refresh_billing_notices(coach,'2026-12-01');
 if not exists(select 1 from public.prorun_billing_notices where user_id=coach and not resolved and stage=0 and restriction_date='2026-12-04') then raise exception 'Due date or grace mismatch';end if;
 perform prorun_private.refresh_billing_notices(coach,'2026-12-04');
 if not exists(select 1 from public.prorun_billing_notices where user_id=coach and not resolved and stage=-2) then raise exception 'Restriction notice missing';end if;
 perform prorun_private.refresh_billing_notices(student,'2026-12-01');
 if not exists(select 1 from public.prorun_billing_notices where user_id=student and audience='payer' and not resolved) then raise exception 'Student did not receive notice';end if;
 perform prorun_private.refresh_billing_notices(outsider,'2026-12-01');
 if exists(select 1 from public.prorun_billing_notices where user_id=outsider and membership_id=member) then raise exception 'Cross-tenant reminder leaked';end if;
 select id into i from public.prorun_billing_invoices where membership_id=member and installment_number=2;
 perform public.prorun_billing_receipt(i,coach,'pix','Rollback second installment');
 perform prorun_private.refresh_billing_notices(coach,'2026-12-01');
 if exists(select 1 from public.prorun_billing_notices where user_id=coach and not resolved and target_date='2026-12-01') then raise exception 'Paid invoice still alerts';end if;
 -- Treino edits do not participate in the financial contract snapshot.
 if (select contract_end from public.prorun_memberships where id=member)<>'2027-01-31'::date then raise exception 'Contract dates drifted';end if;
 perform prorun_private.refresh_billing_notices(coach,'2027-01-24');
 if not exists(select 1 from public.prorun_billing_notices where user_id=coach and not resolved and kind='renewal' and target_date='2027-01-31' and stage=7) then raise exception 'Contract end reminder missing';end if;
 -- A renewed fixed cycle preserves all previous receipts and rejects overlap.
 m=public.prorun_billing_save_v2(coach,jsonb_build_object('id',member,'issuer_org_id',org,'subject_type','athlete','athlete_id',aid,'subject_name','Rollback test','amount_cents',1000,'months',1,'first_due_date','2027-02-01','enabled',true,'grace_days',3,'plan_kind','periodization','payment_schedule','full','contract_end','2027-03-15'),
 '[{"period_start":"2027-02-01","period_end":"2027-03-15","due_date":"2027-02-01","amount_cents":1000,"installment_number":1}]',true);
 perform public.prorun_billing_issue_contract(member,'[{"period_start":"2027-02-01","period_end":"2027-03-15","due_date":"2027-02-01","amount_cents":1000,"installment_number":1}]');
 if (select count(*) from public.prorun_billing_invoices where membership_id=member)<>4 then raise exception 'Renewal duplicated or deleted invoices';end if;
 if not exists(select 1 from public.prorun_billing_invoices where membership_id=member and period_start='2026-11-01' and status='paid') then raise exception 'Prior receipt overwritten';end if;
 insert into public.athlete_plans(athlete_id,plan_data) values(aid,'{"weeks":[],"endDate":"2027-12-31"}');
 if (select contract_end from public.prorun_memberships where id=member)<>'2027-03-15'::date then raise exception 'Workout changed financial contract';end if;
 if has_table_privilege('authenticated','public.prorun_billing_notices','select') or has_function_privilege('authenticated','public.prorun_billing_save_v2(uuid,jsonb,jsonb,boolean)','execute') then raise exception 'Direct financial access exposed';end if;
end $$;
select 'contract and reminder rollback checks passed' as result;
