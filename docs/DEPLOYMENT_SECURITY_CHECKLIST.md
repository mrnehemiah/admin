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
- [ ] Admin MFA enablement/verification and leaked-password protection check in Supabase Auth settings.
- [ ] Automated backup configuration and a successful restore drill, verified outside the browser through Supabase Dashboard/CLI.
- [ ] Live browser/mobile E2E as Admin Mkuu and review of browser console/network errors.
- [ ] Cloud uptime, Storage and Edge Function monitoring integration (not represented by the browser probes).
