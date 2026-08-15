# RB Moving Website — Production Backend Build (No Stripe)

This build implements the client-approved workflow:

**Choose Service → Estimated Price → Live Date/Time → Customer Information → Confirm Booking → No Payment Required**

After the job, Administration can create a **Final Invoice** and copy a payment link. The payment page remains a DEMO until Stripe is activated.

## What is now production-oriented

- Consistent main navigation on every customer page.
- Services and Rates are separate pages.
- Book Now starts with every service unselected.
- Estimated subtotal, GST and total update from selected services.
- Booking and availability are designed for a shared Supabase database — no booking/calendar `localStorage` source of truth.
- Server-side booking RPC recalculates prices from the database and enforces a unique active date/time slot, preventing two customers from successfully booking the same slot.
- Public calendar displays Available / Booked / Unavailable.
- Calendar refreshes while the customer is on the booking page.
- Admin uses Supabase Auth and an `admin_users` allow-list.
- Admin manages bookings, job status, blocked dates/times, service prices/availability, reviews, GST/settings and final invoices.
- Reviews are stored centrally and only `visible=true` reviews are public.
- Final invoice lookup is centralized; the customer no longer types the amount.
- Netlify form `rb-booking` remains as a server-side notification copy. Enable owner email notification in Netlify Forms settings.
- Legacy `modules/agenda/agenda.html` now redirects to the single `/booking.html` flow; the old Awaiting Payment booking logic is retired.

## Required activation before live booking

See `supabase/SETUP.md`.

You must create the RB Moving Supabase project, run `supabase/schema.sql`, create the admin Auth user, add that user to `admin_users`, then paste the Project URL + public anon key into `supabase-config.js`.

Until those public project values are added, the informational Services/Rates pages use static fallback data, but **online booking intentionally refuses to create a fake local reservation**. This prevents the old cross-device double-booking problem from returning.

## Reviews

Administration can load authentic Google reviews and choose Visible/Hidden. The database already includes `google_review_id`, `source_url`, visibility and sort ordering for a later authenticated Google sync. Do not publish invented reviews.

## Payment

Stripe is intentionally excluded. The final-invoice payment screen remains a clearly labeled DEMO.


## v9 Invoice module (no Stripe yet)

The Administration dashboard now includes a complete **Invoices** workspace. Administrators can create an invoice from an existing booking or manually, edit service line items/hours/rates, calculate GST and totals, save Draft/Issued/Sent/Paid status, and generate a private public invoice link.

Client invoice links open `invoice.html?token=...` and show client information, service details, hours/quantity, rates, GST, total, invoice number/date/due date and payment status. The page includes **Print / Save PDF** and **Pay Invoice Online**. Payment remains a demo until Stripe is connected.

Administration also provides **Email**, **Text**, and **Copy link** actions. Email/SMS actions open the administrator device's configured email or messaging application with the invoice link prefilled.

### Existing Supabase project: required one-time upgrade

Before using the v9 invoice module on the existing RBMOving Supabase project, run the complete file:

`supabase/invoice_upgrade.sql`

in **Supabase → SQL Editor → New query → Run**. This upgrades the existing `invoices` table, adds `invoice_items`, creates the private public-token invoice function, RLS policy, and grants. It is safe to run once against the current project.

Do not expose a Supabase secret/service-role key in the website. The frontend continues to use only the configured publishable key with RLS.

## v10 Stripe integration

The demo card-entry simulator has been replaced by Stripe-hosted Checkout. Payment amounts are fetched server-side from the final invoice; the browser cannot choose or alter the amount sent to Stripe. Stripe payment confirmation is processed through a signed webhook, which marks the invoice and linked booking Paid in Supabase. See `STRIPE_SETUP.md` and run `supabase/stripe_upgrade.sql` before activation.


## Version 11 – Google Reviews + Admin Access
- Added server-side Google Business Profile Reviews connector (`netlify/functions/google-reviews.js`).
- Reviews page automatically switches to live Google reviews once OAuth environment variables are configured.
- Added rating/review-count summary and Google review links, with Supabase fallback.
- Added secure administrator password reset/set-password flow through Supabase Auth.
- Google credentials and refresh tokens remain server-side in Netlify only.
- Existing booking, invoices, Stripe Checkout, webhooks and Supabase flows are unchanged.

See `GOOGLE_REVIEWS_SETUP.md` for activation steps.
