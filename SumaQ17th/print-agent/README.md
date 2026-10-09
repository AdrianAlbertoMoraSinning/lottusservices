# Sumaq Local Print Agent

Runs on a small always-on computer inside the restaurant and bridges the cloud print queue to the kitchen printer.

## First test (no printer required)
Set:
- `SUMAQ_PRINT_AGENT_TOKEN` = same secret configured in Netlify
- `DRY_RUN=true`

Run `npm start`. Paid/test-paid pickup orders will be claimed and rendered as tickets in the console.

## Network printer test
Set:
- `PRINTER_HOST=<printer IP>`
- `PRINTER_PORT=9100` (initial test)
- `DRY_RUN=false`
- optional `AGENT_NAME=Sumaq-Kitchen-1`

The first driver is raw ESC/POS over TCP. The TP200/TKP300 must be physically tested. If either device rejects raw TCP printing, keep the same Order Hub and replace only this driver/physical printer.
