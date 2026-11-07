# ZUNE PREMIUM ADMIN 3.0 — TOTAL DOMINATION CONTROL CENTER

## Package status
This delivery is a working admin frontend aligned to the supplied ZUNE 3.0 specification and connected to the existing Supabase project configuration. It uses the live database schema and existing server-authorized RPCs where those are available. It does not claim that every marketplace workflow has a complete backend implementation.

## File organization
- `index.html` is a minimal bootstrap only: it contains no sidebar, dashboard, module UI, modal, or application content. It loads `pages/dashboard.html` inside a full-window frame and routes module hashes to the matching file in `pages/`.
- Every module HTML document is stored separately in `pages/` (one file per module), alongside `pages/login.html`. These pages own their module entry markup and load shared styles/scripts from `css/` and `js/`.
- All JavaScript files are stored in `js/`; all stylesheets are stored in `css/`.
- Open `index.html` as the application entry point. Direct module files in `pages/` remain independently addressable.

## Included modules
Dashboard; Users; Sellers & Stores; Seller Applications; Verification; Products; Categories; Orders; Payments; Wallet & Ledger; Withdrawals; Commission Rules; Delivery; Disputes; Support Tickets; Coupons & Promotions; Announcements; Notifications; Reports; Marketplace Settings; Security Center; Audit Logs; Admin Account; ZUNE AI usage; System Health; Database Monitoring; Backup & Recovery.

## Requirements
- Modern browser with internet access.
- Supabase project URL and publishable key in `js/config.js`.
- Existing Supabase Auth admin account. No public admin registration is provided.
- Admin profile must have the backend-controlled `profiles.role = 'admin'` role.
- HTTPS hosting is required for production.

## Install
1. Unzip this package and host the contents of `ZUNE_PREMIUM_ADMIN/` on an HTTPS origin.
2. Confirm `js/config.js` points to the intended Supabase project. It contains a publishable browser key only; never add `service_role` or secret keys.
3. Open `index.html` (or `pages/login.html` directly), sign in using the pre-provisioned Admin Mkuu account, then use the dashboard.
4. Test with a non-admin account and confirm it is denied.

## Backend integration
This package reuses the existing project schema and RPCs, including `admin_dashboard_overview`, `admin_list_users`, `admin_list_seller_applications`, `admin_list_verification_applications`, `admin_set_user_status`, `approve_seller_application`, `admin_review_verification_application`, `admin_review_withdrawal`, `admin_get_settings`, and `admin_update_setting`.

Read operations are restricted by Supabase RLS and RPC authorization. Mutations exposed in the UI are limited to RPCs with server-side admin checks and audit behavior. Other modules are intentionally read-only until a dedicated backend RPC / Edge Function and tests exist. The UI does not update wallet balances, confirm payments, issue refunds, or alter financial records directly.

## Database notes
The connected project was inspected before building. It already contains a broad marketplace schema and multiple ZUNE Admin 3.0 migrations. This package therefore does not create duplicate tables or automatically apply new migrations. Review the database migration history and security advisors before production changes.

## Security and operational cautions
- The browser only uses the Supabase publishable key. Keep service-role keys, webhook secrets, payment-provider credentials and AI provider keys on trusted server infrastructure.
- A frontend route guard is not an authorization boundary. RLS and every privileged RPC must enforce the actor and single-admin invariant server-side.
- Payment success must come from trusted provider verification/webhooks, never from a browser button.
- Wallet balances must be derived from ledger entries; never write balances directly from the client.
- Withdrawal payout status must only be set after the actual payout has been confirmed by the operator/provider.
- Do not represent Supabase Dashboard backup status, uptime, database internals or AI provider cost as available unless those sources are explicitly integrated.
- Enable leaked-password protection and review SECURITY DEFINER RPC grants/findings before production.

## Verification performed
- JavaScript syntax checked with Node.js.
- ZIP integrity checked after packaging.
- Supabase schema, migration history, key RPC signatures and security/performance advisors were inspected.
- Full end-to-end browser tests, payment-provider reconciliation, backup restore drills and all RLS negative-path tests still require execution in the deployment environment.

## Known boundaries
- CSV export is available for loaded datasets. PDF report generation is not implemented.
- Category editing, product moderation, ticket replies, dispute resolution, refunds, commission writes, provider setup, AI configuration changes, session revocation, and backup/restore execution remain read-only or require Supabase Dashboard/provider integrations.
- `System Health` and `Backup & Recovery` display recorded logs only; they do not fabricate live health or backup success.

## Suggested next QA sequence
1. Login as the provisioned Admin Mkuu and check dashboard counts against Supabase SQL.
2. Login as a buyer/vendor and confirm admin routes and RPCs are denied.
3. Test user suspend/reactivate with a test account.
4. Test seller approval with a test seller application.
5. Test verification approve/reject and withdrawal review using test records only.
6. Review RLS and SECURITY DEFINER findings in Supabase Advisors and remediate before production.
7. Test mobile layouts, refresh/deep links, CSV exports and error states.
