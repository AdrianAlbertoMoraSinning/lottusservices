# SumaQ on 17th — Website v2

Multipage restaurant website with reservations, private-event inquiries, Jotform AI concierge, direct pickup ordering, a separate Latin-market shop, two independent carts, Stripe Checkout functions, admin exports, and sales reports by operation/date/product.

## Deploy
Upload this folder to GitHub and connect the repository to Netlify. Build command can remain empty; publish directory is `.`.

## Netlify environment variables
- `STRIPE_SECRET_KEY`
- `SITE_URL` (example: `https://yourdomain.ca`)

## Catalog editing
Edit `commerce-data.js`. Pickup and Shop catalogs are deliberately separate. Current products and prices are an initial editable catalog and must be confirmed by the restaurant before live sales.

## Important architecture note
The current version remains deployable as a static Netlify prototype and stores orders/reservations in browser localStorage. Stripe Checkout is prepared, but production-wide synchronization and reliable cross-device reporting require a central database and a Stripe webhook in the next backend phase.
