# Sumaq Kitchen Order Hub - setup

Implemented foundation:
- Unified kitchen dashboard: `/sumaq17th/kitchen-orders.html`
- Paid web pickup orders can automatically enter the kitchen print queue.
- Local print agent for network printers.
- Print status, kitchen status and reprint support.

## 1. Supabase
Run `supabase/kitchen-order-hub.sql` once in the **Sumaq** Supabase SQL Editor.

This adds:
- `source_channel`, `external_order_id` and `kitchen_status` to `orders`
- `kitchen_print_jobs`
- a trigger that queues a pickup order only after its payment status changes to a value beginning with `Paid`

## 2. Netlify environment variables
Required for the local print bridge:
- `SUMAQ_PRINT_AGENT_TOKEN` = long random secret

Optional:
- `SUMAQ_KITCHEN_STAFF_PIN` = dedicated kitchen PIN. If absent, the dashboard uses `SUMAQ_RESERVATIONS_STAFF_PIN`.

Redeploy after adding variables.

Do not put these secret values in client-side JavaScript or share them in chat.

## 3. Local restaurant computer
Copy `print-agent/` to an always-on Windows/Mac/Linux mini-PC or computer on the restaurant network. Node 18+ is required.

Start with:
- `SUMAQ_PRINT_AGENT_TOKEN=<same secret as Netlify>`
- `DRY_RUN=true`

Run `npm start`. A queued paid pickup order should be rendered as a ticket in the console without touching a printer.

Then obtain the kitchen printer IP and test:
- `PRINTER_HOST=<printer IP>`
- `PRINTER_PORT=9100` (initial raw TCP/ESC-POS test)
- `DRY_RUN=false`

The TP200/TKP300 must be physically tested. If either device rejects raw TCP printing, keep the Order Hub and replace only the local printer driver or physical printer.

## 4. Uber Eats / Skip
Uber Eats and Skip are **not live yet** in this build.

The kitchen dashboard is already designed to display those sources, but live ingestion requires the restaurant's marketplace/API credentials, an approved middleware/provider integration, or provider webhooks. Do not simulate or scrape marketplace orders in production.

Once those credentials/integration routes are available, add a server-side adapter that normalizes each external order into the existing `orders` + `order_items` tables and changes the payment/acceptance state only after all items are stored.

## 5. Current payment caveat
The current Sumaq web Pickup checkout still contains demo-payment logic. Before production launch, replace the demo completion with the real Stripe order-payment confirmation/webhook so only genuinely confirmed/paid web pickup orders are automatically printed.
