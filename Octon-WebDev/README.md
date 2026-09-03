# Octon v1.2 — Integrated Live Research, Code Health & Runtime Review

Octon is Lottus' supervised Web Development AI Agent.

## v1.2 changes the dashboard itself

`Run PLEASE review` now orchestrates the actual live engines instead of a demo baseline:

- GitHub read-only repository inspection;
- source-code health / bug-risk review;
- production runtime smoke verification;
- portal/SEO/security-header snapshot;
- Google PageSpeed Insights / Lighthouse categories;
- current technical standards research;
- current market and competitor research;
- regulatory/compliance issue spotting by jurisdiction;
- traceable findings with evidence, severity, operational impact, commercial impact, recommendation, affected files when known, proposed fix, tests, rollback, confidence and sources.

The dashboard visibly reports **Octon v1.2**.

## Safety rule

Keep `OCTON_GITHUB_WRITE_ENABLED=false`.

Octon may research, audit, diagnose, recommend, generate code and tests autonomously. Commit/push remains blocked until an exact change hash is approved and the global write switch is deliberately enabled later.

## Required Netlify environment variables

Already required:
- `GITHUB_TOKEN`
- `OCTON_APPROVAL_SECRET`
- `OCTON_GITHUB_WRITE_ENABLED=false`

For live web research:
- `OPENAI_API_KEY`
- recommended `OCTON_RESEARCH_MODEL=gpt-5.6-terra`

Optional for frequent PageSpeed automation:
- `GOOGLE_PAGESPEED_API_KEY`

PLEASE defaults are built in, but can be overridden:
- `OCTON_GITHUB_OWNER=AdrianAlbertoMoraSinning`
- `OCTON_GITHUB_REPO=Please`
- `OCTON_GITHUB_BRANCH=main`
- `OCTON_PORTAL_URL=https://pleasewebportal.netlify.app/`
- `OCTON_PORTAL_MARKET=Calgary and surrounding areas, Alberta, Canada`
- `OCTON_PORTAL_JURISDICTION=Alberta, Canada`

## Main endpoints
- `/api/github-read`
- `/api/code-health`
- `/api/runtime-health`
- `/api/portal-snapshot`
- `/api/pagespeed-audit`
- `/api/research-review`
- `/api/live-review`
- `/api/change-hash`
- `/api/approval-token`
- `/api/github-write`

## Important limitations

Static analysis is heuristic. Runtime smoke checks do not exercise authenticated workflows. The next testing layer should add controlled synthetic end-to-end tests with dedicated test accounts and non-production transaction modes.

Regulatory findings are issue spotting for human/legal review, not a legal compliance certification.
