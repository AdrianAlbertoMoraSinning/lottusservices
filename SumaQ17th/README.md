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

## Client photography update (August 2026)
The institutional photographs on Home, Menu, Reservations, Private Events, Delivery, About, Contact and Work With Us were replaced with the exact visual references supplied in `Estructura Web_Sumaq.pptx`. The central Supabase integration, authentication and Netlify data function remain enabled.


## Detailed interface refinements (August 2026)
- Full-button click targets on Home and Menu.
- Unified reference footer on every public page.
- Reservations and Private Events refined to supplied layouts.
- DoorDash visually removed from Delivery; Uber Eats and Skip retained.

### Click-area refinement (August 2026)
The complete graphical Order Now button on Home links to Pickup. The full Uber Eats and Skip logo areas on Delivery are clickable on desktop and mobile.

### Delivery click-target alignment (v16)
The Uber Eats and Skip interactive areas now match the exact logo bounds in the approved Delivery artwork on desktop and mobile, with no visible focus rectangle or displaced hotspot.

## Mobile embedded CTA update (v17)
On Home and Menu, mobile now uses the clickable calls-to-action printed inside the approved design images. Duplicate black mobile buttons are hidden; desktop behavior is unchanged.
