# Production security and data-integrity changes

- Protects every operational page and API route with HTTP Basic Authentication.
- Applies private no-store caching and hardened browser headers.
- Serves private Blob documents only through an authenticated application route.
- Removes the unaudited JSON test-write path from the receipt API.
- Limits uploads to supported image/PDF MIME types and 15 MB.
- Detects exact file duplicates with SHA-256 and likely semantic duplicates by supplier/date/amount/currency.
- Escapes spreadsheet formula prefixes in CSV exports.
- Excludes unapproved, duplicate, archived, and missing-SEK-value rows from SIE.
- Runs Vercel Functions in Frankfurt and pins Node.js 24.x.
- Supports credential rotation through environment variables.
