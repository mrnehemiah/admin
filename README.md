# ZUNE PREMIUM ADMIN — Single Admin Full Control

**Design approved:** Premium Emerald + White + Light Gray. Exactly one Admin Mkuu. All 23 approved feature areas are represented in the navigation, including ZUNE AI and System Health.

## What this package is
This is a fresh, modular admin console scaffold wired to the existing ZUNE Supabase project URL and the database schema/RPC names inspected on 2026-11-06. It does not replace the existing Marketplace or automatically mutate the live database. It uses the existing `profiles.role='admin'` identity model and verifies access with Supabase Auth plus `public.is_admin()`.

## Setup
1. Supabase project URL and its **publishable key** are already configured in `js/config.js`. The publishable key is designed for browser use; never replace it with `service_role` or a secret key.
2. Serve this folder from a local/web server (ES modules do not run reliably from `file://`): `python -m http.server 8080`.
3. Open `http://localhost:8080/login.html`.
4. Sign in with the existing Admin Mkuu Auth account. No signup route exists.

Supabase project URL is already set to `https://rpkogiieegqgxqbzwxwo.supabase.co`.

## Implemented connections
- Auth: `signInWithPassword`, `auth.getUser`, `public.is_admin()` and `profiles` role check.
- Live table readers for the verified ZUNE tables: profiles, seller_applications, products, orders, payments, payment_transactions, wallets, admin_wallet_transactions, verification_applications, verification_requests, transaction_disputes, support_tickets, coupons, delivery_pricing, admin_announcements, admin_activity_logs, admin_settings.
- Existing RPC actions: `approve_seller_application`, `admin_review_verification_application`, `admin_set_user_status`, `admin_set_user_verification`, `admin_update_setting`, `zune_admin_review_payment`, `zune_admin_payment_get_settings`, `admin_users_overview`, `admin_list_users`, `admin_rls_security_audit`.
- Product featured toggle and support reply use table updates protected by existing RLS.
- Reports export CSV. ZUNE AI provides rule-based operational insights from live counts; no external AI provider is configured.

## Important limits — do not mistake UI presence for backend readiness
The existing project schema was inspected, but not every table's RLS policies, constraints, triggers, RPC implementation and side effects have been fully verified. Therefore:
- Wallet balances are read-only. Do not edit balances directly; a ledger-safe adjustment RPC is required.
- Withdrawals/payouts are not exposed as an approval action until a dedicated audited payout RPC and matching table are verified.
- Order status, refunds, dispute resolution, product deletion, category management, payment network mutation, AI external actions and global policy settings are not given speculative write operations.
- Categories table was not present in the inspected public schema.
- UI actions surface actual Supabase errors; no fake success state is shown.

## Single Admin
A read-only check on the connected project returned exactly **one** `profiles.role='admin'` row. Existing admin RPCs also contain a one-admin count check for critical settings/seller approval. An optional trigger migration is included under `supabase/migrations/` to block a second admin promotion. It is **not applied automatically**. Review it with a backup first. Keep a documented owner-controlled recovery route so a lost Admin account does not permanently lock the marketplace.

## Security findings observed during inspection
Supabase Security Advisor reported several `SECURITY DEFINER` functions in the exposed `public` schema callable by `anon` and/or `authenticated`, including admin-named RPCs. Some functions perform their own Admin checks, but every function must be reviewed individually. Do not apply blanket `REVOKE` commands: buyer/seller marketplace flows may rely on some RPCs. Review `supabase/diagnostics/02_security_definer_grants.sql` and test user-facing workflows before changing grants.

The frontend contains only a publishable key. Never add a service-role/secret key. All access must be enforced by RLS and server-side RPC checks, not by hidden buttons.

## Existing project status at build time
- Supabase project: ZUNE (`rpkogiieegqgxqbzwxwo`), region `eu-west-1`, PostgreSQL 17.
- Existing public tables inspected: 46.
- Admin profile count: 1.
- This archive was not deployed to hosting and no live database migration was applied.

## Suggested next verification
After adding the publishable key and signing in, test every page. If a table reports a permission error, inspect its RLS policy. For each additional write action, add a dedicated RPC that validates `auth.uid()` against the sole admin profile, validates inputs, writes audit history, and preserves ledger consistency.
