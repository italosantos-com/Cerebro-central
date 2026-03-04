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
