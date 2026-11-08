alter table public.prorun_invitations alter column created_by drop not null;
alter table public.prorun_invitations add column if not exists platform_admin boolean not null default false;
update prorun_private.legacy_accounts set enabled=false where login='leandro';
