# Secure external GitHub repository authorization

Octon v1.3 supports repository review for platforms owned by other GitHub accounts through a GitHub App.

## Why a GitHub App

The repository owner authorizes access directly in GitHub. They choose the account and repositories that the App may access, and can revoke the installation later. Octon does not request the owner's GitHub password or a personal access token.

## Register the Octon GitHub App

In GitHub Developer Settings create a GitHub App named, for example, `Octon WebDev Review`.

Recommended configuration:

- Public: enabled if unrelated GitHub owners should be able to install it.
- Repository permissions:
  - Contents: **Read-only**
  - Metadata: **Read-only**
- No write repository permissions.
- Setup URL: `https://octon-webdev.netlify.app/`
- Redirect on update: recommended.
- Webhooks: not required for v1.3.

After creating the App, configure these in Netlify:

- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY` — store the private key only in Netlify environment variables. Do not commit it.
- `OCTON_GITHUB_APP_SLUG` — the slug shown in the GitHub App public/install URL.

## Owner workflow

1. In Octon click **Evaluate another GitHub owner's platform**.
2. Click **Authorize securely on GitHub**.
3. GitHub shows the owner the account and repository-access selection.
4. The owner grants access only to the repository/repositories they want Octon to evaluate.
5. GitHub returns the browser to Octon with an installation identifier.
6. Octon validates that installation with the GitHub App credentials and retrieves only repositories available to the installation.
7. Authorized repositories appear in Octon's repository selector as **external authorized**.
8. The owner can revoke the GitHub App from GitHub at any time.

## Important security note

GitHub warns that an `installation_id` present in a setup URL must not simply be trusted. Octon therefore validates the installation server-side against GitHub before listing any repositories or creating an installation access token.

## Organization-owned repositories

If a user does not have permission to install the GitHub App on an organization, GitHub's own installation flow can require/request authorization from the organization owner according to that organization's GitHub App access policy.
