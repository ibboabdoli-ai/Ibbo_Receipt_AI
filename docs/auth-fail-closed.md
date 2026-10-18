# Authentication hardening — fail-closed by default

This PR removes the publicly embedded fallback Basic Authentication credentials.

Middleware now requires BOTH production environment variables:
- `APP_BASIC_AUTH_USERNAME`: nonblank username.
- `APP_BASIC_AUTH_PASSWORD_SHA256`: exactly 64 hexadecimal characters corresponding to the SHA-256 of the new password.

Missing, empty or malformed values always produce HTTP 401, even if a Basic Auth header is supplied. Existing private/no-store response headers remain in place.

## Deployment blocker: current Vercel metadata review (2026-10-18)
In the currently linked Vercel project `ibbo-receipt-ai`, the environment variable listing contains neither `APP_BASIC_AUTH_USERNAME` nor `APP_BASIC_AUTH_PASSWORD_SHA256` for Production (nor Preview). No variable values were decrypted or read.

**Do not merge and deploy until the owner has set BOTH Production variables securely in Vercel, verified that the hash matches the intended new password without sharing it in GitHub, and agreed to the cutover.** Once deployed, missing values will intentionally lock out all users. Credentials must be rotated; removing a leaked default from the latest revision does not erase its history. Use dashboard secret settings and a controlled rollout/rollback plan, not a commit or public issue.

## Verification
`scripts/ci-auth-fail-closed.mjs` starts isolated HTTP servers bound only to 127.0.0.1, with a temporary local SQLite database and synthetic credentials. It checks:
1. Missing both variables -> 401, no authenticated API access.
2. Missing username -> 401.
3. Missing hash -> 401.
4. Invalid hash -> 401.
5. Whitespace-only username -> 401.
6. Valid synthetic credentials -> successful health/API; missing or incorrect authorization -> 401.

No real password, receipt, database, production endpoint, OpenAI or Blob is used.

This does not replace a full authentication security review and does not change Production.
