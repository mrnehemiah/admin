# ZUNE PREMIUM ADMIN 3.0 — Project Structure

```text
ZUNE_PREMIUM_ADMIN_3.0_RESTRUCTURED/
├── index.html                 # Main SPA entry
├── pages/                     # One HTML entry per module
│   ├── dashboard.html
│   ├── users.html
│   ├── sellers.html
│   ├── seller-applications.html
│   ├── verification.html
│   ├── products.html
│   ├── categories.html
│   ├── orders.html
│   ├── payments.html
│   ├── wallets.html
│   ├── withdrawals.html
│   ├── commissions.html
│   ├── delivery.html
│   ├── disputes.html
│   ├── support.html
│   ├── promotions.html
│   ├── announcements.html
│   ├── notifications.html
│   ├── reports.html
│   ├── settings.html
│   ├── security.html
│   ├── audit.html
│   ├── admin-account.html
│   ├── ai.html
│   ├── health.html
│   ├── database.html
│   ├── backup.html
│   └── login.html
├── js/                        # Shared JavaScript modules
├── css/                       # Shared stylesheets
├── sql/                       # Database migrations
├── docs/                      # Technical documentation
└── README.md
```

Kila `pages/<module>.html` ni entry point inayofungua module husika kwa kutumia shared shell na JavaScript ya pamoja. `index.html` inabaki entry point kuu.
\n\n## Entry-point rule (3.0 Pages-Dependent)\n`index.html` is a bootstrap/loader only. It must not contain module UI or shared admin-shell markup. The application UI is loaded from the matching `pages/*.html` document. Shared behavior remains in `js/` and shared styles remain in `css/`.\n