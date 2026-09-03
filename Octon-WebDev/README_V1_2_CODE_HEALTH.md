# Octon v1.2 — Code Health Upgrade

This package extends Octon v1.1 with direct source-code and production-runtime verification.

## New endpoints
- `/.netlify/functions/code-health`
- `/.netlify/functions/runtime-health`
- If your existing `netlify.toml` maps `/api/*` to Netlify Functions, these are also available as `/api/code-health` and `/api/runtime-health`.

## Netlify variables
Existing:
- `GITHUB_TOKEN`
- `OCTON_GITHUB_WRITE_ENABLED=false`

Recommended:
- `OCTON_GITHUB_OWNER=AdrianAlbertoMoraSinning`
- `OCTON_GITHUB_REPO=Please`
- `OCTON_GITHUB_BRANCH=main`
- `OCTON_CODE_SCAN_MAX_FILES=220`
- `OCTON_PORTAL_URL=https://pleasewebportal.netlify.app/`
- `OCTON_RUNTIME_PATHS=/,/service-request.html,/track-request.html`

## Safety
Both new engines are READ ONLY. No source, database record or production transaction is changed.

See `docs/CODE_HEALTH_ENGINE.md`.
