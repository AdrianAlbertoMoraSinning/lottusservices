# Octon v1.0 Architecture

Octon is a supervised control plane for continuous portal improvement. Its operating loop is:

1. Observe: public portal, repository, deployment signals, market, technical standards and applicable rules.
2. Diagnose: identify technical, UX, conversion, security, privacy, accessibility, SEO and competitive gaps.
3. Design: produce an evidence-backed improvement with code/diff, expected impact, risk, test plan and rollback.
4. Approve: Adrian explicitly authorizes the exact change payload.
5. Apply: Octon writes only the approved payload to the approved GitHub repository.
6. Deploy: the existing GitHub -> Netlify workflow deploys the approved commit.
7. Verify: Octon rechecks production and records the result.

## Security invariants

- No GitHub write without `OCTON_GITHUB_WRITE_ENABLED=true`.
- No GitHub write without a valid signed approval token.
- Approval token is bound to the exact change hash, portal, repo and file path.
- Approval expires after 30 minutes in v1.0.
- GitHub token must be fine-grained and repository-scoped.
- Secrets remain in Netlify environment variables, never frontend code.
- Client operational data is not centralized into Octon.

## v1.0 boundaries

The supplied audit endpoint is a baseline engine so the control plane can be deployed first. Live research, repository analysis, browser inspection and AI code generation are the next connectors. This is intentional: credentials and write authority should be added only after the approval gate is working.
