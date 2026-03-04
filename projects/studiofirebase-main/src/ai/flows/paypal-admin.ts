import { defineFlow } from '@/ai/genkit';

// Opens a popup to connect PayPal via Hosting rewrite -> Cloud Function -> Next route
export const paypalAdminLoginUrl = defineFlow({ name: 'paypalAdminLoginUrl' }, async () => {
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = new URL('/genkit/paypal/connect', base).toString();
  return { url, popup: true };
});

// Requests a token refresh using Cloud Function endpoint
export const paypalAdminRefresh = defineFlow({ name: 'paypalAdminRefresh' }, async () => {
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = new URL('/genkit/paypal/refresh', base).toString();
  const resp = await fetch(url, { method: 'POST' });
  const json = await resp.json();
  return json;
});
