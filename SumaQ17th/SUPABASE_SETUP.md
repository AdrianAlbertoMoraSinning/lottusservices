# SumaQ Central Data Setup (Free Tier)

This version replaces browser-only operational storage with one shared Supabase database. Complete these steps once before the central features work.

## 1. Create the free Supabase project

Create a Supabase project for SumaQ. Keep the database password in a secure password manager.

## 2. Create the database and initial catalogue

Open **Supabase > SQL Editor**, paste the complete contents of:

`supabase/sumaq-schema-and-seed.sql`

Run the script once. It creates the tables, security rules, image bucket, and seeds the current Pickup and Shop catalogues.

## 3. Create the administrator

In **Supabase > Authentication > Users**, create the authorized SumaQ administrator by email and password. Disable public user sign-ups in Authentication settings. Any authenticated account in this dedicated project is treated as an administrator, so create only trusted staff accounts.

## 4. Configure the public browser connection

Open `supabase-config.js` and replace:

- `https://YOUR_PROJECT.supabase.co` with the project URL.
- `YOUR_SUPABASE_ANON_KEY` with the project anon/public key.

The anon key is intended to be present in browser code. Row Level Security prevents it from reading private reservations, orders, and events or changing products.

## 5. Configure private Netlify variables

In **Netlify > Site configuration > Environment variables**, add:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Never place the service-role key in GitHub or `supabase-config.js`.

Redeploy the site after adding the variables.

## 6. Test from two devices

1. Open Admin on a computer and sign in with the Supabase administrator.
2. Make a reservation from a different phone/browser.
3. Refresh Admin. The reservation should appear.
4. Change a product price in Admin.
5. Open Pickup from another device. The new price should appear.

## What is central and what remains local

Central in Supabase:
- Pickup dishes and Shop products
- Product images uploaded by Admin
- Reservations
- Private-event inquiries
- Submitted orders and order lines
- Status changes and sales reports

Local only on each customer device:
- Cart contents before checkout
- Pending payment information during the current browser session

## Storage and cleanup

Product uploads are limited to 2 MB each. Admin can delete individual records. The “Clear all” buttons were changed to safer cleanup actions that delete only completed/cancelled/archived records older than one year.

## Current payment state

The current payment screens remain demonstrations. Orders and reservations are stored centrally, but no real card charge occurs until the Stripe Checkout functions and webhook are activated with live Stripe variables.
