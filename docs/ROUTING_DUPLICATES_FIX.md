# Middleware Consolidation and Route Conflict Fix

Date: 2025-11-02

This change resolves duplicated or "crossed" behaviors in routing caused by two middleware files being active simultaneously.

## What was wrong
- Two middleware files existed:
  - `middleware.ts` at repository root (valid)
  - `src/middleware.ts` inside `src/` (also valid to Next.js)
- Next.js treated both, leading to conflicting rules and unpredictable behavior ("páginas cruzadas").

## What changed
- Consolidated the logic into a single file: `middleware.ts` at the repo root.
- Removed `src/middleware.ts` to ensure Next.js only loads the root one.

## Current behavior (single source of truth)
- Admin routes (`/admin`) are ignored by middleware (handled by Admin layout).
- In development (`NODE_ENV=development`), middleware is pass-through.
- `/galeria-assinantes` is allowed; component handles protection.
- `/perfil` requires authentication (`isAuthenticated=true`).
- `/dashboard` requires authentication and active subscription (`isAuthenticated=true` and `hasSubscription=true`).

## Matchers
- `/galeria-assinantes/:path*`
- `/perfil/:path*`
- `/dashboard/:path*`

`/assinante` is intentionally public.

## How to validate
1. Set or clear browser cookies to simulate auth/subscription.
2. Access protected and public routes to confirm redirects:
   - `/perfil` → redirects to `/auth/face` when not authenticated.
   - `/dashboard` → redirects to `/auth/face` when not authenticated; to `/assinante` when no subscription.
   - `/galeria-assinantes` and `/admin` → allowed (middleware does not block).

## Notes
- `src/middleware.ts` was deleted as part of the duplicates cleanup.
- No `pages/` directory exists; routing uses the App Router (`src/app`).
