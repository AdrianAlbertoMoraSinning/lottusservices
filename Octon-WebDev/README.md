# Octon v1.0

**Octon** is Lottus' supervised Web Development AI Agent: a control center for continuously reviewing and improving web portals while keeping final production authority with Adrian.

## What this ZIP already contains

- Responsive Octon dashboard.
- Registry for PLEASE plus the currently known Lottus web-development portfolio.
- PLEASE configured as the first pilot.
- Baseline multi-dimension audit endpoint.
- Finding queue and governance model.
- Signed, expiring approval tokens bound to an exact code-change hash.
- GitHub file writer that refuses to run unless BOTH the global write switch is enabled and a matching approval exists.
- Supabase schema for audit history, findings, changes, approvals and deployments.
- Netlify configuration and environment template.
- Architecture, GitHub setup and roadmap documentation.

## Important v1.0 distinction

The control plane and GitHub safety mechanism are implemented. Live autonomous web/repository/market/legal research is the next connector layer and is intentionally not faked in this release. The dashboard labels the first review as a baseline until those connectors are configured.

## Deploy to GitHub / Netlify

1. Create a new GitHub repository named `Octon` (recommended).
2. Upload the entire contents of this ZIP to the repository root.
3. Create a new Netlify site from that repository.
4. No custom build command is required for the frontend.
5. Configure `OCTON_APPROVAL_SECRET` first.
6. Leave `OCTON_GITHUB_WRITE_ENABLED=false` until GitHub integration testing.
7. Add GitHub credentials only when ready to connect PLEASE.
8. Optional: deploy `supabase/schema.sql` to a dedicated Octon Supabase project for persistent audit history.

## GitHub manual upload note

For the FIRST upload, upload the complete ZIP contents.

For future Octon updates, normally only upload files explicitly listed in that release's update instructions. Never re-upload `node_modules`, `.netlify`, `.env` or local logs.

## Local verification

With Node 20+ installed:

```bash
npm install
npm run check
npm run dev
```

## Core rule

**Octon may research, audit, recommend, generate and test autonomously. It may not write an approved portal change to GitHub unless Adrian explicitly approves that exact change.**
