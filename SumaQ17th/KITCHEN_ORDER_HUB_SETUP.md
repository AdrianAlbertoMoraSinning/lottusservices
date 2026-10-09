# Sumaq Kitchen Order Hub - setup

Implemented foundation:
- Unified kitchen dashboard: `/sumaq17th/kitchen-orders.html`
- Paid web pickup orders automatically enter print queue.
- Generic normalized ingestion endpoint for future Uber Eats / Skip adapters.
- Local print agent for network printers.
- Print status and reprint support.

## 1. Supabase
Run `supabase/kitchen-order-hub.sql` once in SQL Editor.

## 2. Netlify environment variables
Required for the local print bridge:
- `SUMAQ_PRINT_AGENT_TOKEN` = long random secret

Required only when external Uber/Skip adapters are enabled:
- `SUMAQ_ORDER_INGEST_TOKEN` = long random secret

Optional:
- `SUMAQ_KITCHEN_STAFF_PIN` = dedicated kitchen PIN. If absent, the dashboard uses `SUMAQ_RESERVATIONS_STAFF_PIN`.

Redeploy after adding variables.

## 3. Local restaurant computer
Copy `print-agent/` to an always-on Windows/Mac/Linux mini-PC on the restaurant network. Node 18+ is required.

Start in `DRY_RUN=true` first. Then obtain the printer IP and test raw TCP port 9100.

## 4. Uber Eats / Skip
The Order Hub is ready to normalize these sources, but live ingestion requires the restaurant's marketplace/API integration credentials or an approved middleware/provider webhook. Do not expose `SUMAQ_ORDER_INGEST_TOKEN` in client-side code.
