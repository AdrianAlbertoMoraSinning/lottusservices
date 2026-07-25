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


## July 2026 catalog update
- The pickup catalog now contains the complete menu supplied from the restaurant's Uber Eats listing, organized into Small Plates, Salads, Del Mar, Large Plates, Sides, Drinks and Desserts.
- Reservation deposits are fixed at CAD 50 for groups over four guests and link to a safe payment demonstration page.
- The Shop contains an estimated ingredient catalog based on core ingredients used by the menu. Prices are approximate Calgary retail values and must be confirmed before commercial launch.
- Admin access uses password SumaQ17*123. The plaintext password is not displayed in the interface or source; the static demo compares a SHA-256 hash. For production-grade security, move authentication to Netlify Identity or a server-side authentication provider.
- Pricing references consulted for estimates included current Walmart Canada, Real Canadian Superstore and Calgary specialty retailer listings in July 2026.
