# Octon v1.2 — Code Health & Runtime Verification Engine

This module gives Octon the additional capability requested by Adrian: inspect the source code itself and determine whether defects, integration mistakes, broken references, security issues, missing tests, runtime failures or other technical problems may affect portal operation.

## Two independent checks

### 1. `/api/code-health`
Read-only repository inspection through the existing `GITHUB_TOKEN`.

It checks:
- repository tree integrity;
- broken HTML asset/page references;
- frontend references to Netlify Functions that do not exist;
- duplicate DOM ids;
- missing image alt attributes;
- unsafe `_blank` links;
- credential-like strings in source;
- `eval()` / dynamic-code execution;
- empty catch blocks;
- debug traces;
- presence of automated tests;
- repository-level quality signals.

Each result includes severity, evidence, file and recommendation.

### 2. `/api/runtime-health`
Read-only smoke verification against the deployed portal.

It checks:
- HTTP availability;
- response status;
- response time;
- obvious production/server error pages;
- basic HTML integrity;
- title, viewport, description and H1 presence;
- key browser security headers.

The default target is PLEASE. Configure `OCTON_PORTAL_URL` and `OCTON_RUNTIME_PATHS` in Netlify for each portal.

## Important limitation

Static analysis cannot prove that a transactional portal is bug-free. The next layer should add controlled synthetic end-to-end workflows using dedicated test accounts, test data and non-production payment/email modes. Octon must never create real customer/provider transactions merely to test production.

## Governance

This release does NOT enable GitHub writing.

`OCTON_GITHUB_WRITE_ENABLED=false` must remain in place.

Octon may detect and design a fix automatically, but the exact code change must still be reviewed and approved before a commit/push is permitted.
