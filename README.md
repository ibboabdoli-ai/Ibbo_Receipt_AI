# Ibbo Receipt AI

Private, mobile-first receipt and invoice workflow for AI extraction, manual review, monthly reporting, and Swedish bookkeeping preparation.

## Current capabilities

- Image and PDF upload to private Vercel Blob storage
- AI extraction of receipt, invoice, VAT, supplier, OCR, and accounting fields
- Exact-file and semantic duplicate detection
- Manual correction, approval, archive, restore, permanent delete, and AI reprocessing
- Search, filters, sorting, pagination, and bulk actions
- Currency-safe reporting with separate native-currency totals and optional SEK conversion
- Filtered CSV, clean CSV, Excel, and SIE exports
- PWA manifest, installable icons, service worker, and mobile navigation
- Turso schema migration performed safely at runtime

## Production architecture

- Next.js 15 / React 19
- Turso/libSQL
- Private Vercel Blob
- OpenAI vision/document extraction
- Vercel Functions in Frankfurt (`fra1`)

## Required environment variables

```text
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
BLOB_READ_WRITE_TOKEN
OPENAI_API_KEY
OPENAI_MODEL                 # optional
APP_BASIC_AUTH_USERNAME      # recommended override
APP_BASIC_AUTH_PASSWORD_SHA256 # recommended override
```

Generate a password hash:

```bash
node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" "YOUR_PASSWORD"
```

## Validation

```bash
npm install
npm run check
```

`npm run check` runs TypeScript, ESLint, Vitest, and the production Next.js build.
