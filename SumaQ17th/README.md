# SumaQ on 17th prototype

Folder path for GitHub/Netlify: `/SumaQ17th/`

## What is included
- Single-page prototype preserving the original design sequence from the supplied PDF:
  1. Home
  2. Menu
  3. Reservations
  4. Private Events
  5. Delivery
  6. About
  7. Contact
  8. Work With Us
- Extracted page images from `WebSumaq.pdf` inside `assets/screens/`.
- Working reservation form with adults, minors, party size, date, time, notes, payment status and deposit calculation.
- Admin dashboard: `/SumaQ17th/admin.html`
  - Prototype PIN: `SUMAQ2026`
  - Export reservations CSV
  - Export private events CSV
  - Configure whether deposit is required and amount per adult/minor
- Private event inquiry form.
- Optional Stripe checkout function: `netlify/functions/sumaq-create-reservation-checkout.js`.

## Current prototype limitation
Reservations are saved in browser `localStorage`. This is suitable for demo/prototype. For production, paste a Google Apps Script Web App URL into `APPS_SCRIPT_URL` in `SumaQ17th/script.js`, or connect a database/API.

## Stripe setup
The function uses the same environment style as the existing Lottus Stripe configuration:
- `STRIPE_SECRET_KEY`
- `SITE_URL`

Success URL: `/SumaQ17th/payment-success.html`

## Recommended next production step
Replace the page screenshots with the original image assets from the designer when they are provided, keeping the same order and visual philosophy.
