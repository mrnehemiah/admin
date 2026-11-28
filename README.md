# ZUNE PREMIUM ADMIN — build mpya

Package hii ina muundo wa Admin Mkuu uliokubaliwa:
- Sidebar ya kudumu kwenye desktop; sidebar inayoteleza kwenye simu (haijaondolewa).
- Bottom navigation ya simu: Home, Users, Sellers, Orders na More/Notifications.
- Top navigation yenye global search, profile na notification bell.
- SPA routing: kila kipengee cha navigation kinafungua page section yake na URL hash yake; back/forward na refresh huhifadhi page.
- Notification Center yenye unread badge, preview dropdown, mark-as-read na Supabase Realtime.
- Admin role check dhidi ya `profiles.role = 'admin'`.
- Seller role ni `vendor`; buyer role ni `buyer`.
- Seller details profile ina sehemu za taarifa za mtu/duka, verification, activity, orders, products, wallet, disputes na security.
- Commission policy ya ZUNE ni 3%; hesabu ya mapato haibuniwi bila kuthibitisha amount/payment schema.
- Audit log table append-only kwa RLS na trigger ya kuzuia UPDATE/DELETE.

## Muundo

```text
ZUNE_PREMIUM_ADMIN/
├── index.html
├── login.html
├── admin.js
├── README.md
├── css/admin.css
├── js/
│   ├── config.js
│   ├── login.js
│   ├── security.js
│   ├── layout.js
│   ├── router.js
│   ├── core.js
│   ├── dashboard.js
│   ├── users.js
│   ├── sellers.js
│   ├── products.js
│   ├── orders.js
│   ├── wallet.js
│   ├── transactions.js
│   ├── disputes.js
│   ├── delivery-pricing.js
│   ├── notifications.js
│   ├── reports.js
│   └── activity-logs.js
└── sql/01_admin_notifications_and_audit.sql
```

## Kuweka kwenye hosting

1. Upload folder contents kwenye sehemu ya admin ya hosting yako; usiweke `index.html` ndani ya subfolder tofauti na `css/` na `js/`.
2. Supabase URL na publishable key tayari zimewekwa kwenye `js/config.js` kulingana na taarifa ulizotuma. Publishable key ni salama kuwekwa frontend; USIWEKE `service_role` key hapa.
3. Fungua Supabase Dashboard → SQL Editor, kisha run `sql/01_admin_notifications_and_audit.sql`.
4. Hakikisha `profiles` ina row ya akaunti ya msimamizi yenye `role='admin'`. Login hutumia Supabase Auth email/password.
5. Hakikisha RLS ya marketplace tables inaruhusu Admin SELECT. Package haitazima RLS wala kubadilisha policies zilizopo.
6. Deploy site kupitia HTTPS.

## Phase 5 — Admin Intelligence (2026-11-28)

- Added guarded RPC `admin_intelligence_overview(p_from, p_to)` in `migrations/20261128_admin_intelligence_overview.sql`.
- RPC requires a signed-in Admin Mkuu, verifies the single-admin invariant, validates the date window, and grants execution to `authenticated` only (not `anon`).
- Dashboard now reads aggregate metrics from the RPC rather than independently counting raw tables for the primary KPI cards.
- Date filters: last 7 days, last 30 days, last 90 days, this month, all time, and custom date range.
- Financial measures are explicitly separated: completed-order gross value and order commission are not described as confirmed cash received; paid payments, paid verification transactions, wallet liabilities, pending withdrawals, and Admin Wallet balance are separate measures.
- Operations signals include open disputes (including waiting-for-buyer/seller states), open support, in-transit deliveries, payout holds, high/critical security events, and AI usage/error summaries.
- Dashboard failures show an error state; it does not fall back to fabricated or partial-sample financial totals.
- Live signed-in Admin browser execution and visual/mobile E2E verification are still required. The RPC migration is applied to the shared Supabase project.

## Data tables zinazotumiwa

| Module | Table / source | Hali |
|---|---|---|
| Users & Sellers | `profiles` | Inasoma `select *`; seller ni `role='vendor'` |
| Seller applications | `seller_applications` | Table ipo kwenye seller application code ya mradi; schema ya columns haibadilishwi |
| Products | `products` | Inasoma records; columns zisizojulikana huonyeshwa kwa fallback |
| Orders | `orders` | Inasoma records; totals huonyeshwa tu kama amount column inapatikana |
| Wallet | `admin_wallet_transactions` | Jina la table limetumika kwenye code iliyokuwepo; hakiki RLS |
| Disputes | `transaction_disputes` | Jina la table limetumika kwenye code iliyokuwepo; hakiki RLS |
| Notifications | `admin_notifications` | Hutengenezwa na SQL migration hii |
| Admin Activity | `admin_activity_logs` | Hutengenezwa na SQL migration hii |

## Notifications za matukio ya wateja

Notification center hupokea rows kutoka `admin_notifications` na kusikiliza Realtime. SQL migration ina function `zune_create_admin_notification(...)` inayopatikana kwa `service_role` pekee. Backend/Edge Function au database trigger inayojua schema halisi ya event inapaswa kuiita baada ya tukio kufanikiwa, mfano seller application, product submitted, order created, withdrawal request au dispute opened. Hii imeachwa upande wa trusted backend kwa makusudi; hatujabuni columns/triggers kwenye tables za wateja ambazo hatujaziona.

Mfano wa server-side call (usiweke service-role key kwenye browser):

```sql
select public.zune_create_admin_notification(
  'Maombi mapya ya Seller',
  'Seller mpya ametuma ombi la kujiunga.',
  'seller_application', 'high',
  'seller_applications', 'APPLICATION_UUID',
  'seller-applications', '{}'::jsonb
);
```

## Vitendo vinavyohitaji backend RPC

Buttons za kusimamisha/kuzuia/kufuta akaunti, kuidhinisha badge, kubadilisha role, kufanya payout/refund au kubadilisha fedha hazijaruhusiwa kuandika moja kwa moja kwenye tables kutoka browser. Zinaonyesha maelezo ya hatua inayohitajika hadi RPC/Edge Function salama ilinganishwe na schema ya Supabase. Hii inazuia kuharibu wallet, orders na foreign keys.

## Mambo ya kuthibitisha kabla ya kuwezesha modules zote

Schema kamili ya `products`, `orders`, `admin_wallet_transactions`, `transaction_disputes`, badge requests, verification documents, categories, delivery pricing, payments, coupons, announcements na support tickets haikupatikana pamoja na files tulizoweza kusoma. Modules hizo zina navigation na UI, lakini baadhi huonyesha ujumbe wa schema mapping badala ya kubuni columns au kuandika data isiyothibitishwa.


## ZUNE PREMIUM ADMIN 2.0 — visual upgrade

- Dark Emerald / Gold / Black visual system.
- Advanced page, card, modal, toast, hover and notification animations.
- Desktop collapsible sidebar with saved preference; mobile drawer and bottom navigation remain available.
- Premium Lucide icon set loaded from CDN; a text/emoji fallback remains in the original markup if the CDN is unavailable.
- Existing page modules and Supabase configuration retained from the supplied project archive.
- Added `css/premium-v2.css` and `js/premium-v2.js`; these are enhancement layers, not replacements for the existing business modules.

### Deployment
1. Back up the current admin folder.
2. Extract this ZIP and deploy the contents of `ZUNE_PREMIUM_ADMIN/` preserving folder paths.
3. Confirm `js/config.js` contains the correct Supabase project URL and publishable key. Never put a service-role key in browser code.
4. Run `sql/01_admin_notifications_and_audit.sql` in Supabase SQL Editor only after reviewing it against the current schema. The admin role check uses `p.role::text = 'admin'` for ENUM compatibility.
5. Test login, navigation, notifications, verification, seller details and all data pages with an Admin account.

Note: New navigation/visual enhancements do not create missing business tables or invent database schemas. Pages whose underlying table is not configured will continue to show their existing connection/schema notice.

## Schema mapping iliyothibitishwa kwenye ZUNE

Muunganisho wa sasa umetumia majina/columns yaliyopo kwenye project:
- `profiles`: `full_name`, `phone_number`, `role`, `is_verified`, `account_status`.
- `orders`: `buyer_id`, `product_id`, `quantity`, `total_price`, `commission_fee`, `status`, `payment_status`.
- `products`: `vendor_id`, `title`, `price`, `stock_quantity`, `is_featured`.
- `payments`: `transaction_reference`, `buyer_id`, `amount`, `payment_method`, `payment_status`.
- `admin_wallet_transactions`: `reference`, `user_id`, `transaction_type`, `amount`, `status`.
- `transaction_disputes`: `case_number`, `order_id`, `opened_by`, `issue_type`, `amount`, `status`.
- `delivery_pricing`, `coupons`, `admin_announcements`, `support_tickets`, `verification_requests`.

`admin_notifications` na `admin_activity_logs` zimeundwa kwenye project iliyounganishwa. Module ya notifications husoma `admin_notifications`, huweka alama ya read na kusikiliza Realtime. Audit module husoma `admin_activity_logs`; audit writes hufanywa kupitia `ZUNE_CORE.audit(...)` kutoka vitendo vya admin vinavyowezeshwa na backend.

Muhimu: buttons za mabadiliko hatarishi (kufuta/ku-block akaunti, kuidhinisha seller, payout/refund na kubadilisha role) bado hazijawezeshwa kwa direct browser writes. Zihitaji RPC/Edge Functions zenye uthibitisho wa Admin Mkuu, reason, na audit log ya server-side. Usiongeze service-role key kwenye frontend.

## System Settings integration (2026-11-06)

- `js/settings.js` connects the System Settings screen to `admin_get_settings` and `admin_update_setting`.
- The Marketplace profile is stored under `marketplace.general` as JSONB. Saving requires an authenticated Admin Mkuu session and a reason; the database RPC writes both `admin_settings_audit` and `admin_activity_logs`.
- The screen remains locked if the read RPC fails. The frontend does not attempt direct writes to either settings table.
- Delivery pricing remains managed by the existing `delivery_pricing` module/table; the Settings card links to that page rather than creating a second source of truth.
- Seller commission remains read-only at 3% until the commission calculation backend is changed and verified to consume a centrally managed setting.
- Account-security controls are informational only. Password, MFA, and session-policy changes are not exposed until they are connected to enforced Supabase Auth controls.
- Marketplace general values are currently persisted in the admin settings registry. The public storefront must be separately connected to read these values before they change live storefront labels/contact details.

Validation performed for this package: JavaScript syntax checks passed for `admin.js` and `js/settings.js`. Database inspection confirmed one `profiles.role='admin'` account, RLS enabled on both settings tables, and the expected empty initial settings/audit tables. The authenticated browser RPC test must still be completed in the signed-in Admin Mkuu session.

## Users Management 2.1

The Users page now uses the admin-only Supabase RPC endpoints instead of reading the `profiles` table directly from the browser:

- `admin_users_overview()` for dashboard counters.
- `admin_list_users(p_search, p_role, p_status, p_limit, p_offset)` for server-side search, filters and pagination.
- `admin_get_user_details(p_user_id)` for the user profile, account metrics, applications, recent orders/products, disputes, wallet transactions and audit history.
- `admin_set_user_status(target_user_id, new_status, action_reason)` for Active, Suspended and temporary Removed states.
- `admin_change_user_role(p_user_id, p_new_role, p_reason)` for controlled Buyer/Seller role changes.

Admin profiles are visible for review but are protected from actions in this page. Permanent account deletion is intentionally disabled until a dedicated backend workflow with approvals, session revocation and retention checks is implemented. Login/device history, advanced risk alerts and custom per-admin permissions are clearly marked as not connected because their data tables and secure RPC contracts have not yet been verified. The interface does not fabricate those records.

Run `node --check` against the JavaScript files after editing. This package uses the existing Supabase project configuration and does not contain a service-role key.

## Actions update (2026-11-12)

- New `js/actions.js` (shared reason modal, CSV-safe export), `js/seller-actions.js`, `js/badges.js`.
- Buttons added: Users (Suspend/Restore/Remove/Role/Badge, state-aware), Sellers (Suspend/Restore/Remove Role/Verify), Seller Requests (Approve/Reject), Badge Requests (Review/Approve/Reject), Badge Management (Remove Badge).
- Run `sql/02_admin_action_rpcs.sql` after reviewing its assumptions: `admin_review_seller_application`, `admin_review_badge_request`, `admin_set_badge`. Buttons show an error until it is applied.
- Fixed: syntax error in `js/core.js`, duplicate `totalUsers` id, stale search responses, full-filter Users export with CSV formula protection, `removed` admins blocked at login.
- Still disabled (no RPC): Block seller, Delete seller, permanent removal.
