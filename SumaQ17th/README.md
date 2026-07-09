# SumaQ on 17th website package

Folder path for GitHub/Netlify: `/SumaQ17th/`

## Implemented changes
- Home keeps the original SumaQ visual sequence and now includes a promotional video placeholder over the hero area.
- Home includes a chatbot placeholder area ready for a future bot script.
- Menu is separated into three category buttons: Main Menu, Nikkei and Cocktails. Each button opens a modal prepared for a PDF or external menu link.
- Reservations include a working form. Online deposit appears only when the party size is greater than 4 guests.
- Private Events is separate from regular reservations and is intended for birthdays, weddings, corporate dinners and special celebrations.
- Delivery now shows only active delivery partners: Uber Eats and Skip. DoorDash was removed.
- Contact includes email, phone, address, hours and Google Maps link.
- Work With Us button opens a prefilled email application.
- Admin dashboard includes deposit controls, CSV export and private event inquiry export.

## Admin
Open `/SumaQ17th/admin.html`.

Prototype PIN: `SUMAQ2026`

Current controls:
- Require deposit: Yes/No
- Adult deposit CAD
- Minor deposit CAD
- Deposit starts above guests, default: 4
- Export reservations CSV
- Export private events CSV

## Current storage limitation
Reservations and private event inquiries are saved in browser `localStorage`. This is suitable for prototype/demo.

For production, connect one of these:
- Google Apps Script Web App URL in `script.js` using `APPS_SCRIPT_URL`
- Netlify Forms
- Airtable/Supabase/database
- Email notification API

## Stripe setup
Included Netlify Function:
`netlify/functions/sumaq-create-reservation-checkout.js`

Required environment variables in Netlify:
- `STRIPE_SECRET_KEY`
- `SITE_URL`

Success URL:
`/SumaQ17th/payment-success.html`

## Delivery links
- Uber Eats: connected.
- SkipTheDishes: connected.
- DoorDash: removed.

## Pending client assets
- Final promotional video for Home.
- Final PDF or external links for Main Menu, Nikkei and Cocktails.
