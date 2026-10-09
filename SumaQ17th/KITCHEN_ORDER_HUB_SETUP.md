# Sumaq Kitchen Order Hub - software complete / physical printer phase deferred

## Implemented now
- Unified kitchen dashboard: `/sumaq17th/kitchen-orders.html`
- Shortcut from Sumaq Administration to Kitchen Hub
- Real Stripe Checkout for web Pickup orders
- Server-authoritative item pricing and totals before payment
- Stripe Checkout confirmation plus signed Stripe webhook backup
- Only paid Pickup orders enter the normal kitchen queue
- Normalized secure ingestion endpoint for Uber Eats / Skip adapters
- Duplicate external-order protection
- Kitchen states: New / Preparing / Ready / Completed
- Print queue status, error visibility and Reprint
- Local print agent for the restaurant-owned printers
- Multi-printer targets (`kitchen`, later `receipt`, `bar`, etc.)
- Automatic recovery of stale print claims
- Automated GitHub smoke checks for the browser JS, Netlify functions and official menu JSON

## 1. Sumaq Supabase migration
Run `supabase/kitchen-order-hub.sql` once in the **Sumaq** Supabase SQL Editor.

The migration is idempotent. It adds:
- `source_channel`, `external_order_id` and `kitchen_status` to `orders`
- `kitchen_print_jobs`
- unique external-order protection
- multi-printer routing by `printer_target`
- a trigger that queues paid Pickup orders when inserted already paid or when payment changes from unpaid to `Paid...`

This is the only database activation step. The ChatGPT Supabase connection currently available to this project does not have permission to the Sumaq Supabase project, so the SQL must be executed from the Sumaq project SQL Editor unless that project is connected/granted to ChatGPT.

## 2. Web Pickup payment flow
Production flow:
1. Website sends the selected products and customer information to `sumaq-data`.
2. `sumaq-data` ignores client-submitted prices and rebuilds the order using server-side catalogue pricing.
3. Order and line items are stored as `Pending` / `Awaiting payment`.
4. `order-payment.js` reloads the authoritative order totals from the server before displaying the payment amount.
5. `sumaq-create-order-checkout` reloads the stored order/items and creates Stripe Checkout from those server-side values.
6. Stripe returns to `order-confirmation.html` with the Checkout Session ID.
7. `sumaq-confirm-order-payment` retrieves that Session directly from Stripe, checks the Sumaq order metadata and marks it `Paid` only when Stripe reports payment completed.
8. `stripe-webhook.js` independently performs the same completion if the buyer closes the browser before returning.
9. The database trigger creates the `kitchen` print job.

This removes the old demo-payment path from the Pickup production flow and prevents a browser/user from changing the amount that Stripe charges.

## 3. Kitchen staff portal
Open:
- `/sumaq17th/kitchen-orders.html`

The dashboard shows Pickup, Uber Eats and Skip as separate sources and provides:
- open / ready / print-issue counters
- New / Preparing / Ready / Completed states
- item quantities and names
- customer/order notes
- payment status
- print status and errors
- Reprint

Authentication uses `SUMAQ_KITCHEN_STAFF_PIN` if configured. If absent, it reuses `SUMAQ_RESERVATIONS_STAFF_PIN`.

## 4. Netlify environment variables
Already used by the live platform:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SITE_URL`

Needed when we activate the physical printer PC:
- `SUMAQ_PRINT_AGENT_TOKEN` = long random secret shared only by Netlify and the local print agent

Needed when an Uber/Skip adapter or approved middleware goes live:
- `SUMAQ_ORDER_INGEST_TOKEN` = long random secret used server-to-server

Optional:
- `SUMAQ_KITCHEN_STAFF_PIN` = dedicated kitchen PIN

Never put any of these secret values in browser JavaScript or GitHub.

## 5. Physical restaurant computer - intentionally later
`print-agent/` is ready to run on an always-on Windows/Mac/Linux PC. Node 18+ is required.

Software-only mode:
- `SUMAQ_PRINT_AGENT_TOKEN=<same secret as Netlify>`
- `DRY_RUN=true`
- `PRINTER_TARGET=kitchen`

Physical activation later:
- `PRINTER_HOST=<printer IP>`
- `PRINTER_PORT=9100` for the first raw TCP/ESC-POS test
- `PRINTER_TARGET=kitchen`
- `DRY_RUN=false`

Ticket currently includes:
- source: PICKUP / UBER EATS / SKIP
- public/external order reference
- pickup/ready date and time
- every item and quantity
- order notes
- customer name and phone when available
- total and payment status
- paper cut command

The TP200/TKP300 belong to the restaurant. Their actual direct-print protocol will be tested during the physical phase. If either printer rejects raw ESC/POS over TCP, the cloud Order Hub, orders, Stripe flow and queue remain unchanged; only the small local driver layer is replaced.

## 6. Uber Eats / Skip readiness
Internal endpoint:
- `/.netlify/functions/sumaq-order-ingest`

The endpoint:
- requires `SUMAQ_ORDER_INGEST_TOKEN`
- accepts only `uber_eats` or `skip`
- rejects duplicate source/external-order combinations
- stores the order initially unpaid/unreleased
- stores all line items first
- only then marks the external order `Paid (external)`, which queues the print job
- deletes the partial order if line-item ingestion fails

Provider activation is separate from the Sumaq software build. Uber Eats requires approved API access/store provisioning for POS/order-manager integrations; Skip requires its own authorized integration or approved middleware. Once credentials are supplied, the provider adapter maps their webhook payload into this already-complete Sumaq ingestion endpoint.

## 7. Automated QA
GitHub workflow:
- `.github/workflows/sumaq-smoke.yml`

It checks syntax for Sumaq browser scripts, all Sumaq Netlify functions, the local print agent, the server pricing data import and the official menu JSON on every relevant push/PR.
