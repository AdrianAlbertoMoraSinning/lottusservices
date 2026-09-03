# Octon v1.5 — Verification Engine

## Objective

Reduce false positives by checking production before a static warning is allowed to materially affect the score.

## Supported verification targets

The Code Health engine now attaches `verificationTarget` metadata to findings that can be validated safely:

- local assets and relative page references;
- static `/.netlify/functions/<name>` references;
- live favicon declarations discovered from the production document.

## Decisions

| Production result | Decision | Active finding status | Score effect |
|---|---|---|---|
| Target returns 404/410 | Issue reproduced | `verified_in_production` | Full |
| Target clearly exists | Static warning cleared | Removed from active findings | None |
| Response is ambiguous / request fails | Inconclusive | `needs_verification` | Minimal |

For Netlify Functions, responses such as 400/401/403/405/422 can still prove that the function route exists; therefore a *missing function* warning is cleared even when the route rejects the verification request.

## Favicon verification

The Verification Engine reads the selected production homepage and finds icon and manifest links. If no icon is declared, it creates a production-verified branding finding. If declared icon assets return 404/410, it creates a production-verified broken-favicon finding. Reachable icons generate no finding.

## Security boundaries

- Only HTTP/HTTPS public URLs are accepted.
- Private/reserved IP destinations are rejected before each request and after redirects.
- Request count, redirects, and timeouts are bounded.
- The engine is read-only.
- Arbitrary GitHub writes are not part of verification.
- Credential findings are never probed against external services.

## Scoring

Severity weights remain risk-based. Evidence multipliers in v1.5 are:

- `verified_in_production`: 1.00
- `confirmed`: 1.00
- `probable`: 0.55
- `needs_verification`: 0.18

Unavailable optional research stages are N/A and do not reduce the score.
