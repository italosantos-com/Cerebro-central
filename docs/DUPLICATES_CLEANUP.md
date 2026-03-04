# Duplicates and Crossed Files Cleanup

Date: 2025-11-02

## Summary
Resolved confusion around duplicated social login components and a duplicate middleware. Established canonical import paths and removed an unused import.

## Changes

1. Middleware consolidation
  - Kept single active middleware at repository root: `middleware.ts`.
  - Removed `src/middleware.ts` to avoid duplicate execution.
  - See `docs/ROUTING_DUPLICATES_FIX.md` for details.

2. Facebook login button duplication
   - Two components existed with similar names but different responsibilities:
     - `src/components/FacebookLoginButton.tsx` — SDK-integrated login button (uses Facebook SDK via hook).
     - `src/components/auth/FacebookLoginButton.tsx` — Admin connect/disconnect UI (uses onConnect/onDisconnect props).
   - Canonical import path for the SDK-integrated variant created:
     - New file: `src/components/social/FacebookLoginButton.tsx` (re-export of the SDK-integrated button).
   - Removed unused import from `src/app/admin/integrations/page.tsx` to prevent confusion.

3. Instagram login button duplication
   - Similar duplication addressed for Instagram:
     - `src/components/InstagramLoginButton.tsx` — SDK-integrated variant.
     - `src/components/auth/InstagramLoginButton.tsx` — Admin connect/disconnect UI.
   - Canonical import path created:
     - New file: `src/components/social/InstagramLoginButton.tsx` (re-export of the SDK-integrated button).

4. Admin PayPal button
- Removido `AdminPayPalConnectButton` a pedido; uso canônico é `src/components/auth/PayPalLoginButton.tsx`.

## Recommended usage
- For Admin "connect account" screens, use the `IntegrationCard` + handlers pattern or the canonical `src/components/auth/PayPalLoginButton.tsx` where applicable.
- For general site login experiences with SDK flows, use the canonical re-exports under `src/components/social/*`.

## Notes
- No breaking changes introduced; re-exports avoid changing existing imports in app code.
- In future, consider renaming admin-specific buttons to `*ConnectButton` to further reduce naming ambiguity (e.g., `AdminFacebookConnectButton`).
# Removed Duplicates and Unused Files

Date: 2025-11-02

The following files were removed as part of duplicates/unused cleanup:

- src/middleware.ts — duplicated middleware (root `middleware.ts` is canonical)
- src/components/admin/AdminPayPalConnectButton.tsx — replaced by `src/components/auth/PayPalLoginButton.tsx`
- src/app/perfil/page-clean.tsx — alternate profile page, superseded by `src/app/perfil/page.tsx`
- src/components/auth/FacebookLoginButton.tsx — admin-style variant removed; prefer `IntegrationCard` handlers or SDK under `components/social/*`
- src/components/auth/InstagramLoginButton.tsx — admin-style variant removed
- src/components/auth/TwitterLoginButton.tsx — admin-style variant removed
- src/components/auth/MercadoPagoLoginButton.tsx — admin-style variant removed

Canonical files kept:
- src/components/FacebookLoginButton.tsx (SDK-integrated variant)
- src/components/social/FacebookLoginButton.tsx (re-export)
- src/components/InstagramLoginButton.tsx (SDK-integrated variant)
- src/components/social/InstagramLoginButton.tsx (re-export)
- src/components/auth/PayPalLoginButton.tsx (canonical PayPal integration button for Admin)

Notes:
- Admin integrations page (`src/app/admin/integrations/page.tsx`) uses inline handlers and `IntegrationCard`, plus `PayPalLoginButton`. No other social auth button components are required there.
