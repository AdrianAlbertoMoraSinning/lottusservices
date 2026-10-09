# Sumaq Kitchen Order Hub - final software setup

Implemented:
- Unified kitchen dashboard: `/sumaq17th/kitchen-orders.html`
- Real Stripe Checkout for web Pickup orders
- Server-side payment confirmation plus Stripe webhook backup
- Paid Pickup orders automatically enter the kitchen print queue
- Normalized server-side ingestion endpoint for Uber Eats / Skip adapters
- Kitchen states: New / Preparing / Ready / Completed
- Print status, error visibility and Reprint
- Local print agent for restaurant-owned network printers
- Multi-printer target support (`kitchen`, and later `receipt`, `bar`, etc.)
- Automatic recovery of stale print claims

## 1. Sumaq Supabase database
Run `supabase/kitchen-order-hub.sql` once in the **Sumaq** Supabase SQL Editor.

The migration is idempotent and adds:
- `source_channel`, `external_order_id` and `kitchen_status` to `orders`
- `kitchen_print_jobs`
- unique external-order protection
- multi-printer routing by `printer_target`
- a trigger that queues paid Pickup orders on INSERT or when payment changes to `Paid...`

## 2. Existing web Pickup payment flow
The former demo completion path has been replaced.

Flow:
1. Website creates the unpaid order in Supabase.
2. `sumaq-create-order-checkout` loads the order from Supabase and creates Stripe Checkout from server-side order values.
3. Stripe returns to `order-confirmation.html` with the Checkout Session ID.
4. `sumaq-confirm-order-payment` retrieves the Session directly from Stripe, verifies the linked Sumaq order and marks it Paid.
5. `stripe-webhook.js` performs the same completion as a backup if the customer closes the browser after paying.
6. The database trigger creates the kitchen print job.

Only a Stripe-confirmed payment can create the normal paid web Pickup print flow.

## 3. Kitchen staff access
Open:
- `/sumaq17th/kitchen-orders.html`

The Kitchen Hub uses `SUMAQ_KITCHEN_STAFF_PIN` if configured. If it is absent, it reuses `SUMAQ_RESERVATIONS_STAFF_PIN`.

## 4. Netlify variables
Already-used platform variables:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SITE_URL`

Needed when the physical printer PC is activated:
- `SUMAQ_PRINT_AGENT_TOKEN` = long random secret shared only between Netlify and the local print agent

Needed only when an external marketplace adapter/middleware is activated:
- `SUMAQ_ORDER_INGEST_TOKEN` = long random secret

Optional:
- `SUMAQ_KITCHEN_STAFF_PIN` = dedicated kitchen PIN

Never put secret values in client-side JavaScript or GitHub.

## 5. Local restaurant computer - physical phase later
Use `print-agent/` on an always-on Windows/Mac/Linux PC on the restaurant network. Node 18+ is required.

First run in software-only test mode:
- `SUMAQ_PRINT_AGENT_TOKEN=<same secret as Netlify>`
- `DRY_RUN=true`
- `PRINTER_TARGET=kitchen`

For physical activation later:
- `PRINTER_HOST=<printer IP>`
- `PRINTER_PORT=9100` for the first raw TCP/ESC-POS test
- `PRINTER_TARGET=kitchen`
- `DRY_RUN=false`

The TP200/TKP300 are restaurant-owned. We will test their direct network protocol physically. If a device rejects raw ESC/POS/TCP, the cloud Order Hub and database stay unchanged; only the local driver/device layer changes.

## 6. Uber Eats / Skip
The internal Sumaq Order Hub side is ready.

Endpoint:
- `/.netlify/functions/sumaq-order-ingest`

It accepts normalized server-to-server orders for `uber_eats` or `skip`, prevents duplicate external order IDs, stores order/items, marks the marketplace order paid externally, and lets the database trigger queue it for kitchen printing.

Live marketplace activation still requires provider-authorized API/webhook credentials or approved middleware. Those credentials are an external dependency, not unfinished Order Hub logic.
