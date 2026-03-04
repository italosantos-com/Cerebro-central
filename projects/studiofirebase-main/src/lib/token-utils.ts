// Utility to retrieve provider tokens from cookies in Next.js route handlers
// Keeps API stable with existing imports: getToken('twitter', req.cookies)
import type { RequestCookies } from 'next/dist/compiled/@edge-runtime/cookies';

/**
 * Returns an access token for a given provider by reading HTTP-only cookies.
 * Currently supports 'twitter'.
 */
export async function getToken(provider: 'twitter', cookies: RequestCookies | undefined | null): Promise<string | null>;
export async function getToken(provider: string, cookies: RequestCookies | undefined | null): Promise<string | null> {
  if (!cookies) return null;

  switch (provider) {
    case 'twitter': {
      // Primary cookie set after OAuth callback
      const token = (cookies as any).get?.('twitter_access_token')?.value;
      return token || null;
    }
    default:
      return null;
  }
}

/**
 * Helper to compute cookie max-age from seconds (fallback 1 hour)
 */
export function getCookieMaxAge(seconds?: number): number {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return 3600;
  // Cap at 30 days
  return Math.min(s, 30 * 24 * 3600);
}
