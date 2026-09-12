SumaQ Staff Reservations - Netlify Function Root Hotfix

Reason:
The lottus-services Netlify project deploys functions from the repository-level
/netlify/functions folder. The staff reservation function had only been added
under /SumaQ17th/netlify/functions, so the browser request to
/.netlify/functions/sumaq-staff-reservations returned a failed request.

Upload this file to:
netlify/functions/sumaq-staff-reservations.js

Then trigger a Netlify redeploy.

Existing environment variable:
SUMAQ_RESERVATIONS_STAFF_PIN

Existing Supabase SQL setup remains valid and does not need to be re-run.
