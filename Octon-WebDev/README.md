# Octon v1.5 — Verification Engine

Octon v1.5 builds on v1.4 Diagnostic Quality and adds a **production verification layer** between static source-code findings and final scoring. The goal is simple: do not penalize a portal for a suspected broken asset, route, favicon, or Netlify Function until Octon has attempted to verify what production is actually serving.

## What changed in v1.5

- **Production Verification Engine.** Static findings that expose a verifiable target are checked against the selected production URL.
- **False-positive clearing.** If a supposedly missing asset, route, or Netlify Function is reachable in production, that finding is removed from the active finding set before scoring.
- **Verified in production status.** When production returns a definitive missing response (`404`/`410`) for a suspected broken target, the finding is promoted to `verified_in_production`.
- **Inconclusive verification handling.** Ambiguous responses do not become confirmed failures; they remain `needs_verification`.
- **Favicon verification.** The verification pass inspects the live document for declared icons/manifest and checks whether declared favicon assets are reachable.
- **Verification-aware scoring.** `verified_in_production` and `confirmed` findings receive full weight, `probable` receives partial weight, and `needs_verification` receives minimal weight. N/A modules do not reduce the score.
- **Traceable production evidence.** Verified findings record target URL, response status, timestamp, and verification decision.
- **Mission Control v1.5 UI.** Dashboard now displays verified-in-production and cleared-by-production counts and adds Production verification as a distinct pipeline stage.
- **Updated Octon identity.** New Octon mark plus SVG/PNG favicons, Apple touch icon, PWA icons, and web manifest.
- Existing v1.4 consolidation, evidence confidence, credential redaction, URI-scheme awareness, capability preflight, repository selector, GitHub App read-only access, SSRF protections, chunked scanning, and approval-gated write architecture remain intact.

## Review pipeline

1. Repository map
2. Code Health
3. Production verification
4. Runtime
5. Portal / SEO / security headers
6. Performance & accessibility
7. Current technical standards research — N/A when OpenAI API is not configured
8. Market & competition research — N/A when OpenAI API is not configured
9. Regulatory issue spotting — N/A when OpenAI API is not configured

## Verification semantics

- `verified_in_production`: the suspected issue was directly reproduced in production.
- `confirmed`: directly observed evidence that does not require a live target check.
- `probable`: strong static/runtime signal, but deployment context can still matter.
- `needs_verification`: insufficient evidence for automatic action.
- `cleared by production`: not an active finding; the deployed target exists, so the static warning is removed before scoring.

## Safety

Keep `OCTON_GITHUB_WRITE_ENABLED=false`.

GitHub repository access remains read-only (`contents:read`, plus GitHub metadata read access). Production verification performs read-only HTTP requests against the selected public portal URL. GitHub commit/push remains blocked unless the global write switch is deliberately enabled later **and** an exact approved change hash is presented.

Credential findings remain diagnostic signals only and are never exposed with the detected secret value. Production verification does not attempt to validate credentials.

## OpenAI API

`OPENAI_API_KEY` remains optional. Without it, research stages 07–09 are N/A and do not reduce the score. The Verification Engine does not require OpenAI.

## GitHub App variables

- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `OCTON_GITHUB_APP_SLUG`

## Production verification controls

Optional environment variables:

- `OCTON_VERIFY_MAX_TARGETS` — maximum static targets verified per review (default 40; capped at 80).
- `OCTON_VERIFY_TIMEOUT_MS` — per-target request timeout (default 7000 ms; capped at 15000 ms).

See `docs/V1_5_VERIFICATION_ENGINE.md`, `docs/GITHUB_APP_EXTERNAL_ACCESS.md`, and `UPLOAD_INSTRUCTIONS.txt`.
