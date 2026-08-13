# RB Moving v10 — Stripe activation checklist

This build replaces the demo card form with Stripe-hosted Checkout for final invoice payments.

## 1. Stripe account

The RB Moving owner must create/activate the Stripe account directly with the business/legal representative and payout bank information. Do not put banking credentials, Stripe passwords, MFA codes, secret API keys, or webhook secrets in GitHub.

Use Stripe Sandbox/Test mode first. Stripe recommends server-side Checkout Session creation and a webhook for reliable payment confirmation.

## 2. Supabase one-time upgrade

Run:

`supabase/stripe_upgrade.sql`

in Supabase SQL Editor after the v9 invoice upgrade.

## 3. Netlify Functions directory

For the current `lottusservices` monorepo where RB Moving lives in `/rbmoving`, set:

- Package directory: `rbmoving`
- Publish directory: `rbmoving`
- Functions directory: `rbmoving/netlify/functions`

The included `rbmoving/netlify.toml` expresses the same paths relative to the repository root.

## 4. Netlify environment variables

Add these in Netlify > RB Moving > Project configuration > Environment variables:

- `STRIPE_SECRET_KEY` = Stripe sandbox/test secret key initially; later live secret/restricted key
- `STRIPE_WEBHOOK_SECRET` = signing secret for the Stripe webhook endpoint
- `SUPABASE_URL` = existing RB Moving Supabase project URL
- `SUPABASE_SECRET_KEY` = Supabase server-side secret key (preferred if available)
  - alternatively `SUPABASE_SERVICE_ROLE_KEY` is supported by this build
- `SITE_URL` = `https://rbmoving.ca`

Never expose the Stripe secret key, webhook secret, or Supabase secret/service-role key in frontend files or GitHub.

## 5. Stripe webhook endpoint

Create an Account webhook destination in Stripe Workbench / Webhooks:

`https://rbmoving.ca/.netlify/functions/stripe-webhook`

Subscribe at minimum to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

Copy that endpoint's signing secret (`whsec_...`) directly into Netlify as `STRIPE_WEBHOOK_SECRET`.

## 6. Test flow

1. Create an Issued invoice in Administration.
2. Open its public invoice link.
3. Click **Pay Invoice Online**.
4. Click **Pay securely with Stripe**.
5. Complete a Stripe sandbox/test payment.
6. Confirm the success page says Stripe payment confirmed.
7. Confirm Supabase `invoices.status = Paid` and `bookings.payment_status = Paid` for linked bookings.
8. Confirm Administration shows the invoice as Paid.
9. Review the event in Stripe Workbench and confirm HTTP 200 from the webhook.

## 7. Go live

After the sandbox flow passes, activate the Stripe account, switch `STRIPE_SECRET_KEY` to the live key, create/confirm the live webhook destination and replace `STRIPE_WEBHOOK_SECRET` with the live endpoint secret. Test one small real invoice payment before client launch.
