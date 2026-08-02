# SumaQ on 17th — Central Data Edition

Complete multipage website ready for GitHub and Netlify. This edition introduces shared data through Supabase Free so updates and customer activity are visible from every device.

## Centralized features

- Pickup and Shop catalogues loaded from Supabase.
- Product names, prices, descriptions, availability and images shared across all devices.
- Reservations and private-event inquiries stored centrally.
- Submitted orders and order lines stored centrally.
- Supabase email/password authentication for Administration.
- Shared sales reports.
- Product images uploaded to Supabase Storage.
- Safe cleanup of old completed/cancelled/archived records.
- Customer carts remain local only until checkout, which is intentional.

## One-time activation required

The ZIP contains all code, SQL and instructions, but it cannot connect to a project that does not yet exist. Follow `SUPABASE_SETUP.md` after uploading to GitHub.

Required files:

- `supabase/sumaq-schema-and-seed.sql`
- `supabase-config.js`
- `.env.example`
- `SUPABASE_SETUP.md`

## Netlify

Build settings are already in `netlify.toml`. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as protected Netlify environment variables.

## Security

Never commit the Supabase service-role key or Stripe secret keys to GitHub. Only the public anon key belongs in `supabase-config.js`; Row Level Security limits its access.

## Payments

The current card screens are demo flows. The database centralization is real once configured, but real Stripe payment confirmation still requires Stripe Checkout and a verified webhook.
