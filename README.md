# Ibbo Receipt AI

Receipt scanner and expense dashboard.

## Production security

The application is protected by HTTP Basic Authentication in `middleware.ts`.
All pages and API routes require authentication.

The built-in credentials can be rotated without changing source code by setting:

- `APP_BASIC_AUTH_USERNAME`
- `APP_BASIC_AUTH_PASSWORD_SHA256`

Generate a SHA-256 password hash with:

```bash
node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" "YOUR_PASSWORD"
```

Vercel Functions are configured to run in Frankfurt (`fra1`) through `vercel.json`.
