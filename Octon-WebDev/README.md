# Octon v1.3 — Mission Control

Octon v1.3 is a complete consolidated upgrade of the v1.2 package supplied by the user.

## What changed

- Repository selector: Octon can review any repository visible to its primary GitHub credential.
- Secure external-repository flow through a **GitHub App**. The external owner authorizes Octon inside GitHub and chooses the exact repositories Octon may read.
- No external owner is asked to send Octon a password or Personal Access Token.
- Real visual progress while Octon works.
- Code Health is now **chunked**: the dashboard first maps the repository, then scans code/text files in batches and displays `files reviewed / planned code files / total repository files`.
- The browser orchestrates review stages independently instead of relying on one long `live-review` Netlify Function.
- The prior `Unexpected token '<'` failure is handled safely: every API response is read as text first, and HTML/non-JSON Netlify error pages are reported as an explicit component error rather than crashing the entire dashboard.
- More elaborate Mission Control visual design.
- Runtime and portal fetching now reject local/private network destinations to reduce SSRF risk.

## Review pipeline

1. Repository map
2. Code Health
3. Runtime
4. Portal / SEO / security headers
5. Performance & accessibility
6. Current technical standards research
7. Market & competition research
8. Regulatory issue spotting

## Safety

Keep:

`OCTON_GITHUB_WRITE_ENABLED=false`

External GitHub App installations are intentionally **read-only** (`contents:read`, `metadata:read`). External authorization does not give Octon write permission.

## Existing Netlify variables

- `GITHUB_TOKEN`
- `OCTON_APPROVAL_SECRET`
- `OCTON_GITHUB_WRITE_ENABLED=false`
- `OPENAI_API_KEY`
- optional `GOOGLE_PAGESPEED_API_KEY`
- recommended `OCTON_RESEARCH_MODEL=gpt-5.6-terra`

## New variables for external GitHub owners

- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `OCTON_GITHUB_APP_SLUG`

See `docs/GITHUB_APP_EXTERNAL_ACCESS.md`.
