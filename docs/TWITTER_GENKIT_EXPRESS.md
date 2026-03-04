# Twitter OAuth orchestration via Express (Genkit-friendly)

This project already implements the full Twitter OAuth flow in Next.js API routes:

- `GET /api/auth/twitter-login` → starts OAuth (PKCE)
- `GET /api/auth/twitter-callback` → exchanges code for tokens and sets secure cookies
- `POST /api/auth/twitter-logout` → clears cookies
- `GET /api/twitter/fotos` → returns photos for the connected account
- `GET /api/twitter/videos` → returns videos for the connected account

To provide an Express-based orchestration layer (useful when calling flows from external tools or Genkit runners), we added a Firebase Cloud Function that simply forwards to those canonical routes:

- `GET /genkit/twitter/login` → 302 redirect to `/api/auth/twitter-login`
- `GET /genkit/twitter/callback` → 302 redirect to `/api/auth/twitter-callback` (preserves query)
- `POST /genkit/twitter/logout` → proxies to `/api/auth/twitter-logout`
- `GET /genkit/twitter/media/photos` → 302 redirect to `/api/twitter/fotos`
- `GET /genkit/twitter/media/videos` → 302 redirect to `/api/twitter/videos`

## Deployment

- Hosting rewrites are added so any request to `/genkit/twitter/**` is routed to the new function `genkitTwitter`.
- The function is located at `functions/src/genkitTwitter.ts` and exported from `functions/src/index.ts`.
- Ensure the following env is set so the function can build proper absolute URLs when needed:
  - `NEXT_PUBLIC_BASE_URL` or `NEXT_PUBLIC_SITE_URL` (e.g., `https://italosantos.com`)

## Local testing (optional)

Run the Functions emulator (dependencies must be installed in `functions/`):

```bash
cd functions
npm install
npm run serve
```

Then open:
- http://localhost:5001/<your-project>/us-central1/genkitTwitter/genkit/twitter/health
- http://localhost:5001/<your-project>/us-central1/genkitTwitter/genkit/twitter/login

These will forward to your Next.js routes.

## Notes

- The source of truth for OAuth remains the Next.js API routes. The Express function is a thin orchestrator layer and doesn’t duplicate cookie/token logic.
- Frontend pages should keep calling `/api/twitter/fotos` and `/api/twitter/videos` as they already do. No UI changes required.
