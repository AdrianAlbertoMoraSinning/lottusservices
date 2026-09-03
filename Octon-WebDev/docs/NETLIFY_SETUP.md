# Netlify setup for Octon v1.3

The Netlify site must keep **Base directory = `Octon-WebDev`** because Octon lives inside the `lottusservices` monorepo.

Build command: blank  
Publish directory: `.`  
Functions directory: `netlify/functions`  
Production branch: `main`

Environment variables:
- `GITHUB_TOKEN`
- `OCTON_APPROVAL_SECRET`
- `OCTON_GITHUB_WRITE_ENABLED=false`
- `OPENAI_API_KEY` (required for live web research)
- `OCTON_RESEARCH_MODEL=gpt-5.6-terra` (recommended)
- `GOOGLE_PAGESPEED_API_KEY` (optional but recommended for frequent automated PageSpeed requests)

After deployment:
1. Load `/` and confirm header says **Octon v1.3**.
2. Click **Test GitHub read-only**.
3. Click **Run PLEASE review**.
4. Confirm the component panel shows Code health and Runtime, not a baseline-only message.
5. Confirm findings are evidence-based. If a connector is not configured, its component must show ERROR/PARTIAL rather than inventing findings.
6. Confirm Write access remains OFF.


## v1.3 additional setup

To enable external GitHub owners:
- Create a public GitHub App with Contents read-only and Metadata read-only.
- Set its Setup URL to `https://octon-webdev.netlify.app/`.
- Add `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` and `OCTON_GITHUB_APP_SLUG` in Netlify.

The dashboard still works with the primary `GITHUB_TOKEN` if the GitHub App is not configured; only external-owner authorization remains disabled.
