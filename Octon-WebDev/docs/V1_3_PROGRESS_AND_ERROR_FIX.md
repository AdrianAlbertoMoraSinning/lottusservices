# v1.3 progress architecture and the HTML/non-JSON error

## Why the v1.2 review could fail with:

`Unexpected token '<', "<HTML> <HE"... is not valid JSON`

The browser expected JSON from one long integrated serverless request. If Netlify returned an HTML error document (for example after a function routing/timeout/platform failure), `response.json()` attempted to parse the HTML as JSON and the whole review stopped.

## v1.3 fix

The dashboard now:

- calls each review stage independently;
- reads every response as text first;
- attempts JSON parsing explicitly;
- reports an HTML/non-JSON response as an individual stage error;
- continues to the next independent stage when safe;
- does not replace failures with demo findings.

## Real code-scan progress

Code Health is no longer one monolithic serverless scan.

`code-health-plan` returns:
- repository total file count;
- text/code files eligible for analysis;
- exact planned file list.

The browser then sends small batches to `code-health-batch`.

After each batch it updates:
- exact files reviewed;
- exact planned code/text file count;
- total repository file count;
- visual percentage.

This avoids pretending that a static spinner represents exact file-level progress.

For non-code stages the overall percentage advances when each stage completes.
