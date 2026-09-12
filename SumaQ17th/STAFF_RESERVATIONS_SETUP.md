# Sumaq Reservations Staff Portal - Setup

This portal gives floor staff a dedicated operational reservations view without exposing the Administration dashboard.

## 1. Supabase migration
Run `supabase/staff-reservations-portal.sql` once in Supabase > SQL Editor.

It adds:
- `reservations.table_label`
- `reservations.staff_note`
- `reservation_activity` audit feed
- activity trigger for new reservations, status changes and table changes

## 2. Netlify environment variable
In Netlify > Site configuration > Environment variables, add:

`SUMAQ_RESERVATIONS_STAFF_PIN`

Set it to a strong staff-only PIN/passcode. Do not put the PIN in GitHub or JavaScript.

The existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` variables must remain configured because the serverless function uses them.

After adding/changing an environment variable, redeploy the site.

## 3. Staff URL
Open:

`https://<your-domain>/sumaq17th/staff-reservations.html`

The staff member enters their name and the staff PIN. After successful verification, the browser stores only a signed 12-hour session token in `sessionStorage`; the PIN itself is not stored.

## 4. Available staff operations
- Today / Upcoming / date-specific views
- Reservation and guest counts
- Guest/contact/deposit details
- Assign/change table
- Update operational status: Reserved, Awaiting deposit, Confirmed, Seated, Completed, No-show, Cancelled
- Optional staff note
- Live activity feed
- Automatic refresh every 45 seconds

Staff cannot use this portal to edit menus, shop products, sales reports, private events, orders or website configuration.

## 5. Floor plan
A floor-plan module is intentionally not included yet. It should be added after Sumaq provides the real table layout and table numbering.
