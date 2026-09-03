# Octon v1.4 — Diagnostic Quality

Octon v1.4 builds on the v1.3 Mission Control architecture and focuses on **signal quality**: fewer false positives, consolidated findings, clearer evidence confidence, and capability-aware scoring.

## What changed in v1.4

- **Unique finding consolidation.** Repeated detections are grouped by fingerprint and their affected files/occurrences are aggregated.
- **Evidence status.** Findings are classified as `confirmed`, `probable`, or `needs_verification`.
- **Credential findings are redacted.** Octon never returns the detected credential value in finding evidence. Strong known-token patterns and generic sensitive assignments are treated differently; both require verification before rotation or removal.
- **URI-scheme awareness.** `sms:`, `tel:`, `mailto:`, `data:`, `blob:`, `javascript:` and any other explicit URI scheme are no longer treated as repository files.
- **Improved relative-path resolution** for local HTML assets.
- **Dynamic Netlify Function references** such as template literals are no longer reported as missing static functions.
- **Capability preflight.** If `OPENAI_API_KEY` is absent, Technical Research, Market & Competition, and Regulatory Research are marked **N/A**, not ERROR.
- **Coverage-aware score.** Optional modules that are not configured do not reduce the portal score.
- **Diagnostic summary.** Mission Control shows unique findings, confirmed/probable/needs-verification counts, priority issues, and raw detections consolidated.
- **Live GitHub App permission display.** The external-access modal attempts to read the App's actual permissions from GitHub rather than showing a hard-coded expected permission list.
- Existing v1.3 repository selector, 0–100% progress, chunked Code Health, GitHub App read-only access, safe HTML/non-JSON API parsing, SSRF protections, and approval-gated write architecture remain in place.

## Review pipeline

1. Repository map
2. Code Health
3. Runtime
4. Portal / SEO / security headers
5. Performance & accessibility
6. Current technical standards research — N/A when OpenAI API is not configured
7. Market & competition research — N/A when OpenAI API is not configured
8. Regulatory issue spotting — N/A when OpenAI API is not configured

## Safety

Keep `OCTON_GITHUB_WRITE_ENABLED=false`.

GitHub App repository access is intentionally read-only (`contents:read`, with GitHub's mandatory metadata read access). External authorization does not give Octon write permission.

Credential findings are **diagnostic signals only**. Never rotate/delete a credential solely because a pattern matched; first verify the finding and determine whether the value is active.

## OpenAI API

`OPENAI_API_KEY` is optional in v1.4. Without it, stages 06–08 are N/A and the rest of the review runs normally. Do not configure a billable API key until Octon's public access controls and usage limits meet the intended deployment model.

## GitHub App variables

- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `OCTON_GITHUB_APP_SLUG`

See `docs/GITHUB_APP_EXTERNAL_ACCESS.md` and `docs/V1_4_DIAGNOSTIC_QUALITY.md`.
