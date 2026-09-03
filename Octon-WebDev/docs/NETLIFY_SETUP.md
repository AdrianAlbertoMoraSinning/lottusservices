# Netlify setup for Octon v1.4

The Netlify site must keep **Base directory = `Octon-WebDev`** because Octon lives inside the `lottusservices` monorepo.

Build command: blank  
Publish directory: `.`  
Functions directory: `netlify/functions`  
Production branch: `main`

Core environment variables:
- `GITHUB_TOKEN`
- `OCTON_APPROVAL_SECRET` (required later for signed change approvals)
- `OCTON_GITHUB_WRITE_ENABLED=false`
- `OPENAI_API_KEY` — optional; leave empty while testing the free/read-only review path
- `OCTON_RESEARCH_MODEL` — configure explicitly only when API research is enabled
- `GOOGLE_PAGESPEED_API_KEY` — optional

GitHub App variables:
- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `OCTON_GITHUB_APP_SLUG`

After deployment:
1. Load `/` and confirm the header says **Octon v1.4**.
2. Verify repository read-only access.
3. Run a review.
4. Confirm Code Health displays file-level progress.
5. Confirm repeated asset findings are consolidated into unique issues with multiple affected files.
6. Confirm `sms:`, `tel:` and `mailto:` links are not reported as missing repository files.
7. With `OPENAI_API_KEY` empty, confirm stages 06–08 show **N/A**, not ERROR, and the review score is not reduced for those skipped modules.
8. Confirm Write access remains OFF.

## GitHub App

Recommended GitHub App repository permissions:
- Contents: **Read-only**
- Metadata: GitHub mandatory read permission
- Everything else: No access
- Webhooks: not required; disable unless Octon later implements and validates a webhook workflow.
- Setup URL: `https://octon-webdev.netlify.app/`
- Redirect on update: useful while testing repository selection changes.
