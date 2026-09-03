# Octon v1.2 Architecture

Browser dashboard -> `live-review` orchestrator -> independent read-only engines.

The integrated review intentionally keeps components independent so a market-research API failure does not get silently converted into a fake successful result. The dashboard shows each component as LIVE, PARTIAL or ERROR.

`code-health` reads repository blobs through GitHub's API and never writes.
`runtime-health` performs unauthenticated smoke checks against configured production routes.
`pagespeed-audit` calls Google PageSpeed Insights v5 for mobile and desktop Lighthouse categories.
`research-review` uses OpenAI Responses API with the web-search tool; `store:false` is set.
`live-review` combines available evidence into a composite score and presents traceable findings.

The write path is separate:
proposed file content -> `change-hash` -> explicit human approval -> signed expiring `approval-token` -> `github-write`.
`github-write` additionally refuses operation while `OCTON_GITHUB_WRITE_ENABLED` is not exactly `true`.
