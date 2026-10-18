# Receipt AI isolated test scope — 2026-10-18

This pilot tests the currently merged main branch using a disposable GitHub Actions runner.
The Next.js server binds only to 127.0.0.1, never to Production.
Five synthetic rows live in a temporary local SQLite file and are erased at the end.
No real OpenAI, Turso, Blob or GitHub write credentials are passed to the runtime.

HTTP assertions cover private authentication, headers, listing, pagination/filter conditions,
spreadsheet formula escaping, clean CSV and SIE exports, rendered HTML, and invalid uploads.

## Important security finding — existing code, not modified here
The public middleware.ts includes a fixed fallback username and SHA-256 password hash.
If either production authentication setting is absent, the application silently falls back.
This is a high-priority authentication configuration risk. Remove the fallback as a separate,
reviewed fail-closed change after confirming real production auth variables are present;
do not rotate or disclose live credentials in this public repository.

This CI-only pilot neither fixes the fallback nor tests the real production auth state.
It does not exercise interactive browser clicks, real AI extraction, private Blob, Turso
production connectivity, security of all third-party packages or production deployment.
No merge or deploy is implied by this pilot.
