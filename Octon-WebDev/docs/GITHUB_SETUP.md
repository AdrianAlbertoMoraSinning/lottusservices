# GitHub connection setup

## Recommended permission model

Create a GitHub fine-grained personal access token dedicated to Octon.

Restrict it to the repositories Octon is permitted to maintain. Start with the PLEASE repository only. Grant the minimum repository contents permission required to update code. Do not use an unrestricted classic token.

Set these Netlify environment variables for the Octon site:

- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `OCTON_APPROVAL_SECRET` (long random value)
- `OCTON_GITHUB_WRITE_ENABLED=false` initially

Deploy and test `/api/status` and `/api/audit` first. Only after approval-flow testing should the write switch be changed to `true`.

## Production rule

An approval is for one exact change, not general authority. Editing the content, repository, portal or file path after approval invalidates the approval.
