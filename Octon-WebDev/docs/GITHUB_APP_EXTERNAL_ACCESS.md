# GitHub App external repository authorization

Octon can review repositories owned by other GitHub accounts through a GitHub App. The repository owner authorizes the App directly in GitHub and chooses which repositories the installation may access. Octon does not ask the owner for a GitHub password or Personal Access Token.

## Recommended GitHub App configuration

- Public: enabled only if unrelated GitHub owners should be able to install it.
- Repository permissions:
  - Contents: **Read-only**
  - Metadata: GitHub mandatory read access
- All other repository, organization, account, and enterprise permissions: No access unless a future feature explicitly requires them.
- Setup URL: `https://octon-webdev.netlify.app/`
- Redirect on update: recommended during testing.
- Webhooks: not required for v1.4; disable unless a webhook handler is intentionally implemented.

Netlify variables:
- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY` — secret; never commit or paste into chat/logs
- `OCTON_GITHUB_APP_SLUG`

## Owner workflow

1. In Octon choose **Evaluate another GitHub owner's platform**.
2. Open the GitHub authorization page.
3. The owner chooses the account and repository access in GitHub.
4. GitHub redirects to Octon's setup URL with an installation identifier.
5. Octon validates that the identifier refers to a real installation of this GitHub App and then requests a short-lived installation token with read-only permissions.
6. Repositories available to that installation appear as **external authorized**.
7. The owner can revoke the installation in GitHub at any time.

## Important security boundary before public third-party rollout

GitHub explicitly warns that a setup URL's `installation_id` can be spoofed and should not, by itself, be treated as proof of the installing user's identity. Server-side validation proves that the installation exists for the Octon App, but it does **not** prove that the current browser/user is the owner of that installation.

Therefore v1.4's external-installation flow is appropriate for controlled testing, but **public customer onboarding should not be considered fully hardened yet**. Before broad third-party rollout, add authenticated user/session binding (for example GitHub user authorization/OAuth and verification that the installation belongs to the authenticated user), plus application authentication and rate limits around review endpoints.
