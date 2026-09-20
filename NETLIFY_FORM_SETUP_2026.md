# Lottus contact form — Netlify configuration

The production form is named `project-contact` and redirects to `/thank-you.html` after a verified submission.

## Required one-time Netlify dashboard setting
1. Open the Lottus site in Netlify.
2. Go to Project configuration → Notifications → Form submission notifications.
3. Add an Email notification.
4. Select form `project-contact` (or all forms, if preferred).
5. Recipient: `lottus.services.inc@gmail.com`.
6. Save and submit one production test.

The form includes the hidden subject `New Lottus project inquiry` and `data-remove-prefix` so the notification subject is clean.

## Verify after deploy
- Forms → Active forms → `project-contact` appears.
- Submit the form from the production domain.
- Confirm redirect to `/thank-you.html`.
- Confirm the submission appears in Netlify Forms.
- Confirm the email reaches `lottus.services.inc@gmail.com` (check Spam once during setup).
