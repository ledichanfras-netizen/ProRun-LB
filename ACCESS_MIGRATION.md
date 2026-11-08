# ProRun account migration

- Existing athlete and plan JSON records remain unchanged; organization ownership is a separate database column.
- Individual sessions use Supabase Auth. Browser storage never determines permissions.
- Admin activation uses a single-use invitation stored only as a token hash. The previous hardcoded administrator password is disabled.
- Existing student credentials migrate through a service-only check and require replacement before any data access. New accounts use individual invitation links.
- Coaches can create manual plans and request analysis for visible athletes. Periodization/strength generation requires an active platform administrator, checked on every server request.
- Google credentials are server-only. Rotate the previous Google key in Google AI Studio because the prior release embedded it in browser assets.
- Invitations expire after seven days and are claimed conditionally. No email is sent by the invite UI: copy and share the link.
- Disabled memberships immediately lose database access even while an Auth JWT remains valid.

## Deployment order

1. Apply account infrastructure, admin activation, and indexes. Deploy `prorun-access` with its own getUser authentication; login/accept are the only unauthenticated actions.
2. Deploy the authenticated application and server AI endpoint.
3. Apply `prorun_cutover` to close anonymous access and enable tenant-bound policies and student write guards.
4. Test separate organizations and student result submission. Remove temporary test accounts and data.
5. Create the administrator activation invitation and deliver its link privately. Do not commit its token.

## Checks

`npm run lint`

`node --import tsx --test tests/accessPolicy.test.ts tests/prescriptionDraft.test.ts tests/prescriptionModels.test.ts tests/gamificationDeduplication.test.ts`

`npm run build`

Database: coach cannot read/write another organization's athletes, student cannot alter prescription, disabled membership returns no athlete data, anonymous access is denied. Invites cannot be reused or elevate the inviter's role.
