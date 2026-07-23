# Production security changes

- Added HTTP Basic Authentication for every page and API route.
- Added security response headers and disabled private response caching.
- Moved Vercel Functions from `iad1` to `fra1`.
- Pinned the project runtime to Node.js 24.x.
- Added environment-variable overrides for rotating the username and password hash.
