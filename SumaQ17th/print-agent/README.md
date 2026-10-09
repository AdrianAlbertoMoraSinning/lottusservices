# Sumaq Local Print Agent

This runs on an always-on computer inside Sumaq and bridges the cloud Kitchen Order Hub to a network printer.

## Software test before printer installation
Set:
- `SUMAQ_PRINT_AGENT_TOKEN` = same secret configured in Netlify
- `DRY_RUN=true`
- `PRINTER_TARGET=kitchen`

Run `npm start`. A paid/test order will be claimed and rendered as a kitchen ticket in the console without touching a printer.

## Physical printer activation (later)
Set:
- `PRINTER_HOST=<printer IP>`
- `PRINTER_PORT=9100` for the first raw TCP/ESC-POS test
- `PRINTER_TARGET=kitchen`
- `DRY_RUN=false`
- optional `AGENT_NAME=Sumaq-Kitchen-1`

The agent automatically recovers a print job if another agent claimed it and disappeared for more than two minutes. Failed jobs remain visible in Kitchen Orders and can be requeued with **Reprint**.

## More than one printer
The cloud queue supports independent printer targets. Run one agent process per target/device (for example `kitchen`, and later `receipt`) with a different `PRINTER_HOST` and `PRINTER_TARGET`.

The initial driver is raw ESC/POS over TCP. The restaurant-owned TP200/TKP300 must still be physically tested. If a device rejects raw TCP printing, the Sumaq Order Hub remains unchanged; only the local printer driver/device layer needs to change.
