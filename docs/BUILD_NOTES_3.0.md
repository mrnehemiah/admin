# ZUNE Admin 3.0 Build Notes

## Data source and design decisions
This build was based on the supplied five-part ZUNE PREMIUM ADMIN 3.0 specification and the prior Users Management ZIP. Before generating the new control panel, the configured Supabase project was inspected. The project already contained a substantial marketplace schema, ZUNE 3.0 migrations, and admin RPCs. Existing tables were reused rather than creating duplicates.

## Modules mapped to existing database sources
- Users: `profiles` via `admin_list_users`.
- Sellers: `stores`; applications via `admin_list_seller_applications`.
- Verification: `admin_list_verification_applications`, `verification_applications`, `verification_requests`.
- Products: `products`; categories: `product_categories`.
- Orders: `orders`; payments: `payment_transactions`.
- Wallet: `wallet_ledger`; withdrawals: `withdrawal_requests`.
- Commission: `commission_rules`; delivery: `delivery_pricing`.
- Disputes: `transaction_disputes`; support: `support_tickets`.
- Promotions: `coupons`; announcements: `admin_announcements`; notifications: `admin_notifications`.
- Audit: `admin_activity_logs`; security: `security_events`; health: `system_health_logs`.
- AI: `ai_usage_logs`; backup: `backup_recovery_logs`; settings: admin settings RPCs.

## Enabled backend mutations
Only the following actions are exposed as interactive writes in this frontend:
- User account status: `admin_set_user_status`.
- Seller application approval: `approve_seller_application`.
- Verification decision: `admin_review_verification_application`.
- Withdrawal review: `admin_review_withdrawal`.
- Admin setting update: `admin_update_setting`.

These RPCs must remain protected by their own server-side authorization. The UI is not a security boundary.

## Not implemented as writes
The UI intentionally does not invent RPCs for category/product moderation, coupon creation, dispute resolution, ticket replies, refunds, commission changes, direct wallet credits/debits, payment confirmation, AI provider configuration, session revocation or backup restoration. Add those only with dedicated server-side contracts, audit behavior, validation, idempotency where applicable, and automated tests.

## Snapshot from connected Supabase project (2026-11-07)
- Project is active and named `ZUNE`.
- Database reports PostgreSQL 17.
- 29 migration records were present at inspection time.
- The public schema included the required marketplace source tables used by the UI.
- `profiles` currently showed exactly one `admin` role at inspection time; the dashboard RPC independently checks the one-admin invariant.
- Supabase Security Advisors reported 25 `SECURITY DEFINER` functions executable by `authenticated` (generic warning; each function must be reviewed for an internal actor check and least-privilege grants), plus leaked-password protection disabled.
- Performance Advisors reported unindexed foreign keys and multiple permissive RLS policies. These findings were not auto-fixed because changing live RLS policies or function grants without full application-wide regression tests could break marketplace access.
