
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBaseUrl() {
  // 1. Prefer explicit public base url variables when provided (works in Cloud Run / App Engine,
  //    and allows local dev to still send production links without extra logic).
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;

  // 2. On the client, use the current origin **unless** it's localhost. When running the app
  //    in development the origin will be http://localhost:3000, which we do *not* want in
  //    verification emails because the recipient will be on the public site.
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    if (!origin.includes('localhost')) {
      return origin;
    }
    // otherwise fall through to server-side logic below
  }

  // 3. In development without a public URL, we still return localhost for dev-only links
  //    (used when there is no chance an email will actually be sent). This branch will only
  //    be hit when running locally and not specifying NEXT_PUBLIC_BASE_URL.
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  // 4. Fallback for Vercel deployments
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;

  // 5. Final fallback, shouldn't normally happen
  return 'https://italosantos.com';
}
