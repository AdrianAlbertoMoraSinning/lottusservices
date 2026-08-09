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
