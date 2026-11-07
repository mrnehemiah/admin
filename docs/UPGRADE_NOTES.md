# Upgrade notes

## 3.0-alignment package
- Preserved the supplied Users Management ZIP source files and existing Supabase project configuration.
- Replaced the old README with an accurate scope statement and installation/security guidance.
- Added the full supplied 3.0 master specification.
- Added a module-by-module implementation matrix and release gate.
- Added a deployment and security checklist.
- Did not invent missing Supabase tables, RPCs, Edge Functions, credentials or production integrations.
- Hardened the login redirect to accept same-origin destinations only, preventing protocol-relative/external redirect targets.\n