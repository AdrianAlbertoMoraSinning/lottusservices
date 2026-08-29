# Groupe VGC – Google Reviews Live Integration

The code is prepared to load reviews automatically from the verified Groupe VGC Inc. Google Business Profile. Until Google OAuth is authorized, `reviews.html` safely falls back to approved reviews stored in Supabase and displays the currently known 5.0 / 10-review summary.

## Google requirements
1. Create/use a Google Cloud project for Groupe VGC.
2. Request/enable Google Business Profile API access. If the Business Profile API quota is 0, submit Google's Basic API Access application.
3. Configure OAuth 2.0 with scope `https://www.googleapis.com/auth/business.manage`.
4. The owner/manager of Groupe VGC Inc. must authorize the application once. Never collect the owner's Google password.
5. Obtain the Business Profile account ID and verified location ID.

## Netlify environment variables
Add these to the `rbmoving` Netlify project. Keep secrets scoped to Functions and marked secret.

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET` **secret**
- `GOOGLE_REFRESH_TOKEN` **secret**
- `GOOGLE_BUSINESS_ACCOUNT_ID`
- `GOOGLE_BUSINESS_LOCATION_ID`
- `GOOGLE_REVIEWS_URL` (optional; public Google Reviews URL)

After adding/changing variables, redeploy the site. `/.netlify/functions/google-reviews` should then return `configured: true` plus `averageRating`, `totalReviewCount`, and reviews.

## Admin password recovery
The Administration login now has **Forgot / Set Password**. In Supabase Auth > URL Configuration, allow:

`https://[DOMAINE_VGC_A_CONFIGURER]/modules/agenda/admin-reset.html`

The client enters the authorized admin email (for example the account already created for Groupe VGC), receives the Supabase recovery email, and sets their own password. No password is stored in GitHub.
