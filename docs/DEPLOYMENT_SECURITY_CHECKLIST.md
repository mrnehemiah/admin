# Deployment and Security Checklist

## Before migration
- [ ] Export/backup the current database and confirm restoration procedure.
- [ ] Inspect live table definitions, constraints, indexes, triggers and existing RLS policies.
- [ ] Confirm `public.zune_is_admin()` exists and is correct.
- [ ] Review migration SQL for naming conflicts and policy side effects.
- [ ] Run migrations in a staging project first.

## Identity and access
- [ ] Admin account provisioned out-of-band by a trusted operator.
- [ ] No public admin signup or role self-assignment.
- [ ] Single-admin invariant enforced in backend/database logic, not only UI.
- [ ] Every sensitive RPC checks `auth.uid()` and admin status itself.
- [ ] Non-admin and anonymous access denied by RLS tests.
- [ ] MFA enabled for the admin where supported.
- [ ] Session revocation and account recovery procedure tested.

## Financial operations
- [ ] Payment status comes only from trusted provider verification/webhooks.
- [ ] Wallet changes are atomic ledger entries; no direct balance edits.
- [ ] Unique references and idempotency keys prevent duplicate processing.
- [ ] Refunds and payouts require authorized server-side workflows.
- [ ] Gross sales, fees, refunds and net revenue are reported separately.
- [ ] Financial records are retained and reconciled.

## Frontend and operations
- [ ] Only Supabase URL and publishable key appear in browser config.
- [ ] No service-role key, passwords, tokens or provider secrets in ZIP.
- [ ] HTTPS enabled.
- [ ] Browser console and network errors reviewed.
- [ ] Mobile layout, keyboard navigation and visible focus tested.
- [ ] Backups, alerts and recovery runbook tested.

## Known limitation
The included SQL migration expects an existing `public.zune_is_admin()` function and existing Supabase auth/profile conventions. It must be reviewed against the live schema. The ZIP cannot prove that remote database functions, RLS policies, providers or backup systems are correctly configured.


## Phase 5 — Admin Intelligence completion record (2026-11-28)

- [x] Admin-only intelligence overview RPC with period bounds and separate operational/financial source metrics.
- [x] Admin-only security posture RPC with actionable RLS and anonymous SECURITY DEFINER findings.
- [x] Deterministic operational risk score with explainable factors; informational only, no automatic account/order/payment actions.
- [x] Admin-login health probes for Data API, Auth session, Admin authorization and Marketplace Data API, written only through the guarded health-log RPC.
- [x] Recent Security Events visible in the Admin Security Center.
- [x] Period-based reports and CSV snapshot export.
- [ ] Owner enables MFA under Supabase Account Security and safely stores recovery codes. This is an account-level action requiring the owner's authenticator.
- [ ] Upgrade organization from Free to Pro or higher if leaked-password protection is required; Supabase Security Advisor currently flags it as disabled and the feature is Pro+.
- [ ] Because the current Supabase organization is Free, configure scheduled supabase db dump logical exports to private off-site storage; or upgrade and verify managed daily backups.
- [ ] Perform a restore drill into a separate non-production project and validate database objects/data plus separately-backed-up Storage files. Never restore over production as a test.
- [ ] Live browser/mobile E2E as Admin Mkuu and review of browser console/network errors.
- [ ] Add synthetic checks for Storage and each critical Edge Function, plus alert routing and cloud uptime monitoring. Supabase listed all deployed Edge Functions as ACTIVE; this is not an execution test.


## Verified project constraints

The linked Supabase organization is currently on the Free plan. Managed daily backups are not included on Free; Supabase recommends regular CLI exports and off-site retention. Leaked-password protection is Pro+ according to Supabase Auth documentation. MFA for the Supabase platform account must be enrolled by the account owner in Account Security with an authenticator app and recovery codes. These cannot be honestly marked complete by code changes alone.
