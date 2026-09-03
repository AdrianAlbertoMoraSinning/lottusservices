# Netlify setup for Octon v1.2

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
1. Load `/` and confirm header says **Octon v1.2**.
2. Click **Test GitHub read-only**.
3. Click **Run PLEASE review**.
4. Confirm the component panel shows Code health and Runtime, not a baseline-only message.
5. Confirm findings are evidence-based. If a connector is not configured, its component must show ERROR/PARTIAL rather than inventing findings.
6. Confirm Write access remains OFF.
