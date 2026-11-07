# ZUNE PREMIUM ADMIN 3.0 (in progress — see docs/STATUS.md)

Msingi wa usalama wa 3.0 umeongezwa juu ya v2.1. Sehemu kubwa za spec bado hazijajengwa; hakuna kilichodaiwa kujaribiwa.

## Install
1. Weka folder kwenye hosting ya HTTPS.
2. `js/config.js` ina URL + publishable key; badilisha kulingana na `.env.example` kama project ni tofauti. Usiweke service_role.
3. Supabase SQL Editor — **staging kwanza** — run kwa mpangilio: `supabase/migrations/0001`, `0002`, `0003`, `0004`.
4. Provision Admin Mkuu mmoja: tengeneza user kwenye Auth, washa MFA, kisha run `supabase/seed/provision_admin.sql.template` (badilisha email).
5. Fanya checks za `tests/rls_and_rpc_checks.sql`.

## Backup/recovery
Tumia Supabase Backups (Dashboard > Database > Backups) kabla ya kila migration; PITR ikiwezeshwa.
