# ZUNE PREMIUM ADMIN 3.0 — Implementation Matrix

| Module | UI | Live source | Write actions in UI | Status |
|---|---|---|---|---|
| Dashboard / Admin Intelligence | Yes | `admin_intelligence_overview(p_from,p_to)` | None | Guarded live read; date filters; gross order value and paid cash separated |
| Users | Yes | `admin_list_users()` | Suspend/reactivate via `admin_set_user_status()` | Live read + guarded RPC |
| Sellers & Stores | Yes | `stores` | None | Live read |
| Seller Applications | Yes | `admin_list_seller_applications()` | Approve via `approve_seller_application()` | Live read + guarded RPC |
| Verification | Yes | `admin_list_verification_applications()` | Approve/reject via `admin_review_verification_application()` | Live read + guarded RPC |
| Products | Yes | `products` | None | Live read |
| Categories | Yes | `product_categories` | None | Live read |
| Orders | Yes | `orders`, `order_deliveries` | Status writes disabled until a verified server-side RPC atomically validates transitions, restores stock on cancellation, records audit and emits notifications | Live read; lifecycle write intentionally locked |
| Product Reviews | Yes | `product_reviews` | Approve/reject with moderation note, audit log, and buyer/Seller notifications | Live read + moderation |
| Payments & Settlement Center | Yes | Recent rows from payment/checkout/provider-event tables (bounded display only) | No financial total writes | Recent records only; lifetime/period totals disabled until a complete ledger-backed finance RPC is verified |
| Wallet & Ledger | Yes | `wallet_ledger` | None | Live read; no direct balance writes |
| Withdrawals | Yes | `withdrawal_requests` | Review via `admin_review_withdrawal()` | Live read + guarded RPC |
| Commission | Yes | `commission_rules` | None | Live read |
| Delivery | Yes | `delivery_pricing` | None | Live read |
| Disputes | Yes | `transaction_disputes` | None | Live read |
| Support | Yes | `support_tickets` | None | Live read |
| Coupons | Yes | `coupons` | None | Live read |
| Announcements | Yes | `admin_announcements` | None | Live read |
| Notifications | Yes | `admin_notifications` | None | Live read |
| Reports | Yes | Dashboard RPC + CSV | CSV export | Partial |
| Settings | Yes | `admin_get_settings()` | `admin_update_setting()` | Live read + guarded RPC |
| Security | Yes | `security_events` | None | Live read |
| Audit | Yes | `admin_activity_logs` | None | Live read |
| Admin Account | Yes | Auth session + `profiles` | Sign out | Partial |
| ZUNE AI | Yes | `ai_usage_logs` | None | Live read |
| System Health | Yes | `system_health_logs` | None | Recorded checks only |
| Database Monitoring | Yes | `admin_export_logs` | None | Recorded exports only |
| Backup & Recovery | Yes | `backup_recovery_logs` | None | Recorded logs only |

## Important
A live-read module is not automatically a fully implemented business workflow. Modules without a guarded server RPC are intentionally read-only. Do not add browser-side writes for finance, payments, wallets, refunds, seller role changes, security controls or privileged settings. Add backend contracts, audit logging, idempotency and tests first.
