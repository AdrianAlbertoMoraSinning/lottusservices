# LuBoutique — High-End Apparel

A production-ready, responsive boutique website for LuBoutique in Calgary, Alberta, Canada.

## Features

- Premium responsive storefront in Canadian English
- Dynamic catalog loaded from `data/products.json`
- Category filters and product options
- Persistent shopping bag using `localStorage`
- WhatsApp and email product inquiries
- Private-list customer registration
- Local admin dashboard with customer metrics and CSV export
- Privacy, terms, shipping, returns and cookie pages
- SEO metadata, Open Graph, Schema.org and favicon
- Netlify security headers and deployment configuration
- Centralized business settings in `data/config.js`

## Contact information

- SMS / WhatsApp: +1 (825) 945-6581
- Email: lufe.portilla23@gmail.com
- Location: Calgary, Alberta, Canada

## Configuration

Edit `data/config.js` to update business information, contact details, social links, hours, currency, language and future payment settings.

The WhatsApp value must contain digits only:

```js
whatsapp: '18259456581'
```

## Product catalog

Products are stored in `data/products.json`. Each product supports:

- ID and SKU
- Name and description
- Brand and category
- Price or inquiry label
- Main image and gallery
- Badge
- Sizes and colours
- Featured, new-arrival and promotion flags

## Local testing

Because the catalog is loaded with `fetch`, run the project through a local web server rather than opening `index.html` directly.

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploying to Netlify

1. Upload this project to a GitHub repository.
2. In Netlify, choose **Add new site → Import an existing project**.
3. Select the GitHub repository.
4. Leave the build command empty.
5. Set the publish directory to the repository root.
6. Deploy the site.

`netlify.toml` already provides recommended security and caching headers.

## Admin dashboard

Open `admin.html` to review locally stored private-list registrations and export them as CSV.

This is a front-end demonstration dashboard. Browser storage is not a secure production database. Before collecting live customer data at scale, connect the forms and dashboard to a secure authenticated backend such as Firebase or Supabase.

## Future integrations

The project is structured for future integration with Stripe Checkout, Firebase, Supabase, Airtable, Google Sheets and a secure authenticated administration system.
