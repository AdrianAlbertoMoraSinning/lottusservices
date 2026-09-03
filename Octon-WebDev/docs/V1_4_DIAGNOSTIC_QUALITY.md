# Octon v1.4 — Diagnostic Quality

## Why this release exists

The first real PLEASE review completed the repository scan successfully but produced a high raw finding count. The test exposed several classes of scanner noise: repeated favicon findings on many pages, a valid `sms:` URI treated as a local file, dynamic Netlify Function names treated as static missing functions, and credential-like patterns that require human verification before action.

v1.4 improves the auditor before Octon is allowed to propose changes to client code.

## Finding consolidation

Each finding may include a stable `fingerprint`. The browser merges findings with the same fingerprint and aggregates:
- affected files
- occurrences
- evidence examples
- sources
- highest severity/confidence observed

This turns repeated manifestations of the same root issue into one actionable finding.

## Evidence status

- **confirmed** — the condition itself was directly observed in source/runtime evidence.
- **probable** — strong evidence exists, but deployment/build context could change the conclusion.
- **needs_verification** — a human must verify the condition before corrective action. Credential-like findings use this state even when the token pattern is strong.

## False-positive controls

- Any explicit URI scheme is excluded from local-file checks (`sms:`, `tel:`, `mailto:`, `http:`, `https:`, `data:`, `blob:`, etc.).
- Relative paths are resolved from the source file directory.
- Template/dynamic references are skipped by static-path validation.
- Netlify Function checks only consider static literal function endpoints.
- Credential values are never returned in finding evidence.

## Scoring

Stages that are not configured are marked **N/A**, not ERROR. In particular, an empty `OPENAI_API_KEY` skips stages 06–08 without lowering the portal score. The score is based on unique evidence-backed findings plus PageSpeed scores when available.

## Verification

`npm run check` performs syntax checks for all Netlify Functions and executes diagnostic self-tests covering URI schemes, relative paths, dynamic function references, and credential redaction.
