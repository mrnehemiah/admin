# Feature matrix

| Feature area | Current implementation | Write status |
|---|---|---|
| Dashboard | Live counts and recent audit events | Read |
| Users | `admin_list_users`, status and verification RPCs | RPC |
| Sellers | Seller applications + approve RPC | RPC |
| Products | Product list + featured toggle | RLS update |
| Categories | Navigation-ready placeholder | No categories table found |
| Orders | Live order list | Read-only |
| Payments | Payments + payment transaction lists; payment review RPC | RPC where applicable |
| Wallet | Wallet balances and admin ledger list | Read-only |
| Withdrawals | Not connected | Requires verified payout table/RPC |
| Commission | Admin settings surface | Settings RPC only; verify business rules |
| Verification | Application and request review RPCs | RPC |
| Delivery | Delivery pricing list | Read-only pending verified write policies |
| Disputes | Dispute list | Read-only pending resolution RPC |
| Support | Tickets and reply update | RLS update |
| Coupons | Coupon list | Read-only pending full constraint/RLS test |
| Announcements | Admin announcements list | Read-only pending full schema/RLS test |
| Notifications | Existing notification table available; view can be added | Read-only pending payload workflow |
| Reports | Live counts + CSV export | Read/export |
| Marketplace settings | `admin_get_settings`, `admin_update_setting` wired through settings page/action | RPC |
| Security | Admin/RLS audit RPC and session check | Read-only |
| Activity logs | Existing admin_activity_logs | Read-only |
| Admin account | Existing Auth account only; no registration | Auth |
| ZUNE AI | Rule-based insights from live metrics | Advisory only |
| System Health | Data API, Auth, Admin RPC checks | Read-only |

This matrix intentionally distinguishes an actual backend write path from a UI listing. More actions must be added only after the matching schema, RLS, RPC and audit behavior are verified.
