# Groupe VGC V12.1 — Multilingual path fix

Corrects the i18n script path for deployment under `/groupevgc/` on lottusservices.ca.

- Root public pages load `i18n.js` relatively.
- Agenda/admin pages load `../../i18n.js`.
- No business logic, Supabase schema, Stripe logic, booking data, or invoice states were changed.
- French remains the default language; FR / EN / ES selector is injected by `i18n.js`.
