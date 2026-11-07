# ZUNE PREMIUM ADMIN 3.0 — Status (honest)
Base: v2.1 package (user upload). Many v2.1 JS files are 1-line stubs: orders, products, wallet,
transactions, disputes, reports, activity-logs, seller-applications, delivery-pricing, login.

| Area | Status |
|---|---|
| Single-admin (DB index + trigger), no self-promotion | Written (0002) — NOT yet run/tested |
| Audited role-change RPC | Written (0002) — NOT tested |
| Append-only wallet ledger + idempotent RPC + balance view | Written (0003) — NOT tested |
| Audit log + notifications | Existing (0001) |
| Dashboard/Users/Sellers/Settings UI | Existing v2.1 (partial) |
| Verification, payments, withdrawals, commissions, delivery, coupons, security center, AI, system health, reports, 3.0 folder layout | NOT built yet (parts 2-5 of spec) |
| Edge Functions (payment webhook verification) | NOT built |

## Update: 0004_core_backend_schema.sql (written, NOT run/tested)
Adds zune_-prefixed tables: settings(+history), commission_rates (effective-dated, insert-only), order_transitions,
coupons(+redemptions), announcements, security_events, system_health_logs, backup_logs, ai_settings, ai_logs,
support_tickets/messages, delivery_providers/zones. Admin-only RLS; append-only on logs/history.
RPCs: set_setting, set_commission, update_order_status (assumes orders.status), validate_coupon.
Still NOT built: all frontend pages for these modules, Edge Functions (payment webhook, health probe, scheduled
announcements), withdrawal/payment/refund/dispute/verification/seller-approval RPCs, reports/CSV/PDF, bulk actions,
global search, 3.0 folder restructure, tests beyond manual SQL checks.
