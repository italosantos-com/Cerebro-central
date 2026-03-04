# Admin Profile Page

Status: Implemented
Path: `src/app/admin/profile/page.tsx`

What it does:
- Shows admin avatar, name, and email
- Update display name (uses `useAuth().updateUserProfile`)
- Change email (requires current password; sends verification via `useAuth().updateUserEmail`)
- Change password (current + new + confirm via `useAuth().updateUserPassword`)

UI dependencies:
- Uses existing shadcn UI primitives under `@/components/ui/*`
- No external icon libraries are required

Notes:
- This page is a client component; it relies on the AuthProvider context
- Environment-level type errors (missing React/Next types) must be resolved in your local setup (`npm i`, ensure `@types/react`, `@types/node`, and `next` are installed)

Recommended follow-ups:
- If a profile photo upload is desired for admins, port the minimal photo upload snippet from `src/app/perfil/page.tsx` (Firebase Storage `uploadBytes` + `getDownloadURL`, then `updateProfile` and Firestore `updateDoc`)
- Deprecated files mentioned in earlier notes (`page-clean.tsx`, `AdminPayPalConnectButton.tsx`) have been physically removed during the duplicates cleanup.
