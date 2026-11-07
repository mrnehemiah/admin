# ZUNE PREMIUM ADMIN — Upgrade Package (3.0 alignment)

**Package status:** upgraded foundation based on the supplied `2.1 USERS MANAGEMENT` ZIP and the supplied ZUNE 3.0 specification.  
**Important:** this is **not** a claim that all 23+ modules in the 3.0 specification are implemented. The existing package is primarily a Users Management admin application. This upgrade preserves working code, clarifies its real integration boundaries, and adds the 3.0 master specification and implementation controls.

## What's included

- Existing ZUNE Admin frontend, CSS, JavaScript and SQL migration, preserved.
- Supplied ZUNE Premium Admin 3.0 specification in `docs/`.
- An implementation matrix distinguishing existing functionality, backend-dependent functionality and modules not yet implemented.
- A deployment/security checklist and environment configuration guidance.
- Existing Supabase project URL and publishable key retained in `js/config.js`. A Supabase publishable key is intended for browser use; never add a service-role key or other secret to frontend files.

## Current implementation scope

| Area | Current package status |
|---|---|
| Admin login | Supabase Auth password login; profile role check in frontend |
| Admin route guard | Session and `profiles.role` check in frontend |
| Users list | Uses `admin_list_users` RPC |
| Users overview | Uses `admin_users_overview` RPC |
| User details | Uses `admin_get_user_details` RPC |
| User account status | Uses `admin_set_user_status` RPC; backend function must enforce authorization |
| Seller/product/order/financial screens | Some navigation/UI exists; do not assume full operational integration |
| Notifications | SQL table, admin read/update policies and Realtime-oriented frontend support |
| Admin activity logs | SQL table and append-only trigger; browser audit helper is best-effort, not a substitute for trusted server-side audit |
| Remaining 3.0 modules | Not complete unless separately implemented, migrated and tested |

## Required backend RPC contracts

The Users Management screen expects these existing RPC functions:

- `admin_users_overview()`
- `admin_list_users(p_search, p_role, p_status, p_limit, p_offset)`
- `admin_get_user_details(p_user_id)`
- `admin_set_user_status(target_user_id, new_status, action_reason)`

Confirm the exact argument names and return shape in the connected Supabase project before deployment. Every function that reads private user data or changes account state must independently verify `auth.uid()` and admin authorization on the server. Frontend checks are only a usability layer.

## Install / deploy

1. Host the contents of `ZUNE_PREMIUM_ADMIN/` on an HTTPS origin. Keep `index.html`, `login.html`, `css/` and `js/` at the relative paths shown.
2. Confirm `js/config.js` points to the intended Supabase project and contains only the project URL and publishable key.
3. Review `sql/01_admin_notifications_and_audit.sql` against the live database and run it in Supabase SQL Editor only after backup and review.
4. Confirm the database already has the required `profiles` schema and `public.zune_is_admin()` helper referenced by the migration. Do not run blindly on an unknown schema.
5. Confirm the admin account is provisioned securely by an authorized operator. Do not create a public admin registration flow or allow self-promotion.
6. Confirm the four RPC contracts above exist, have correct grants, validate the actor server-side, and return the expected fields.
7. Verify RLS on every table exposed to the browser. The publishable key is public by design; RLS and server authorization are the security boundary.
8. Deploy over HTTPS and test with an admin account and a non-admin account.

## Security requirements before production

- Enforce the single-admin invariant in trusted backend/database provisioning logic; a frontend role check does not enforce one-admin-only.
- Protect all sensitive RPCs with server-side authorization and input validation.
- Keep `service_role` keys, provider secrets and signing secrets out of browser code, ZIP files and source control.
- Keep RLS enabled and test both allowed and denied access paths.
- Treat payment, wallet, refund, withdrawal and commission changes as server-side ledger operations only. This package does not implement those financial workflows.
- Do not expose passwords, access tokens, private documents or unnecessary personal data in logs.
- Audit sensitive actions server-side. The included browser audit helper is best-effort and must not be treated as tamper-proof evidence.
- Back up the database before migrations and maintain a tested recovery procedure.

## 3.0 implementation order

Use `docs/IMPLEMENTATION_MATRIX.md` to track modules. Recommended sequence:

1. Inspect the actual Supabase schema, RLS policies, triggers and RPCs.
2. Harden identity, single-admin provisioning, authorization and audit.
3. Complete Users, Sellers and Seller Applications.
4. Complete Products, Categories and Verification.
5. Implement Orders, Payments, Wallet Ledger, Withdrawals and Commission with idempotency and reconciliation.
6. Implement Delivery, Disputes, Support, Promotions and Notifications.
7. Implement Reports, Settings, Security Center, AI Control Center and System Health.
8. Add automated tests, mobile QA, backup/recovery tests and production monitoring.

## Honest delivery rule

A screen is not a completed module merely because it appears in navigation. Mark a module complete only when its UI, database schema, RLS, RPC/Edge Functions, validation, audit trail, error states and tests are all present and verified. The supplied 3.0 master specification is preserved in `docs/ZUNE_PREMIUM_ADMIN_3.0_MASTER_SPEC.md`.
