# RB Moving v12 — Invoice entry fixes

## Changes
- Hours / Qty now accepts decimal values in 0.01 increments on desktop and mobile.
- Added decimal keyboard hint for mobile devices.
- Added inline guidance: `4.5 = 4 h 30 min`.
- Added editable **Invoice number** field for manual/direct-client invoices.
- Leaving Invoice number blank preserves automatic RB Moving numbering.
- Existing invoices can have their invoice number edited.
- Duplicate invoice numbers are blocked with a clear validation message.

## No database migration required
The `invoices.invoice_number` field already has a UNIQUE constraint in the existing RB Moving schema.

## Preserved
Google Reviews v11 preparation, Admin password reset, Booking, Supabase, Stripe Live, Stripe webhook, and payment status logic are unchanged.
