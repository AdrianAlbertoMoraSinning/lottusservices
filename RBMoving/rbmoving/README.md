# RB Moving — Approval Build

Static GitHub/Netlify-ready website prototype.

## Implemented
- Responsive service catalogue with photos, descriptions, hourly pricing and quantities.
- Booking cart with subtotal, configurable GST and estimated total.
- Scheduling page with selectable time slots and admin-controlled blocked dates/times.
- Existing bookings automatically make their start slot unavailable in the same browser demo.
- Demo credit/debit card checkout. Card number/CVV are validated only in the page and are not saved.
- Booking/payment confirmation references.
- Administration dashboard for bookings, statuses, CSV export, availability, service pricing/activation, settings and selected authentic reviews.
- Public reviews area displays only reviews marked visible in Administration.

## Approval-mode storage
This build intentionally uses browser localStorage/sessionStorage so it can be uploaded directly to GitHub/Netlify with no backend credentials. Data is browser/device-specific.

## Production connection after client approval
Replace the storage adapter in `booking-app.js` with Supabase tables for services, bookings, booking_items, availability, reviews and settings. Replace the demo payment handler in `payment.html` with Stripe Checkout/Payment Element. Never store raw card numbers or CVV.

## Main pages
- `index.html`
- `rates.html` — services catalogue
- `modules/agenda/agenda.html` — scheduling
- `payment.html` — demo checkout
- `modules/agenda/admin.html` — administration
