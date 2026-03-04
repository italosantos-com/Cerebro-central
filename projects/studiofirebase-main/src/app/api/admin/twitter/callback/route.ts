
import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { verifySignedOAuthAdminState } from '@/lib/oauth-admin-state';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state');
  const code = searchParams.get('code');

  // Retrieve codeVerifier and state from cookies
  const codeVerifier = request.cookies.get('twitter_code_verifier')?.value;
  const savedState = request.cookies.get('twitter_state')?.value;

  if (!state || !code || !codeVerifier || !savedState || state !== savedState) {
    // Redirect back to popup callback with error so UI can show toast
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'twitter');
    url.searchParams.set('error', 'twitter_auth_failed');
    url.searchParams.set('message', 'Invalid authentication callback');
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('twitter_code_verifier');
    resp.cookies.delete('twitter_state');
    return resp;
  }

  const verifiedState = verifySignedOAuthAdminState('twitter', state);
  if (!verifiedState.valid) {
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'twitter');
    url.searchParams.set('error', 'twitter_auth_failed');
    url.searchParams.set('message', `Invalid state: ${verifiedState.reason}`);
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('twitter_code_verifier');
    resp.cookies.delete('twitter_state');
    return resp;
  }

  const adminUid = verifiedState.uid;

  const clientId = process.env.TWITTER_CLIENT_ID
    || process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID
    || process.env.TWITTER_API_KEY;
  if (!clientId) {
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'twitter');
    url.searchParams.set('error', 'twitter_server_error');
    url.searchParams.set('message', 'Twitter Client ID não configurado');
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('twitter_code_verifier');
    resp.cookies.delete('twitter_state');
    return resp;
  }

  const client = new TwitterApi({
    clientId,
    clientSecret: process.env.TWITTER_CLIENT_SECRET || process.env.TWITTER_API_SECRET,
  });

  try {
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const isLocal = request.nextUrl.hostname === 'localhost' || request.nextUrl.hostname === '127.0.0.1';
    const envCallback = process.env.TWITTER_CALLBACK_URL || process.env.NEXT_PUBLIC_TWITTER_CALLBACK_URL;
    const callbackUrl = (!isLocal && envCallback) ? envCallback : new URL('/api/admin/twitter/callback', base).toString();
    const { accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: callbackUrl,
    });

    // Fetch user info to get the username for UI/localStorage
    let username: string | undefined;
    try {
      const authed = new TwitterApi(accessToken);
      const me = await authed.v2.me({ 'user.fields': ['username'] as any });
      username = (me as any)?.data?.username || undefined;
    } catch (e) {
      // Non-fatal if username fetch fails
      console.warn('Twitter username fetch failed:', e);
    }

  // Set secure cookies with access/refresh tokens for server API routes to use
  const response = NextResponse.redirect(new URL('/auth/callback', base));
    response.cookies.set('twitter_access_token', accessToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: Math.max(60, Math.min(expiresIn || 3600, 30 * 24 * 3600)),
    });
    if (refreshToken) {
      response.cookies.set('twitter_refresh_token', refreshToken, {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        // Long-lived refresh token, cap at 90 days
        maxAge: 90 * 24 * 3600,
      });
    }

    // Clear the temporary cookies used for PKCE
    response.cookies.delete('twitter_code_verifier');
    response.cookies.delete('twitter_state');

    // Add query params for the popup callback page to postMessage back
  const redirectUrl = new URL(response.headers.get('Location') as string);
    redirectUrl.searchParams.set('platform', 'twitter');
    redirectUrl.searchParams.set('success', '1');
    if (username) redirectUrl.searchParams.set('username', username);
    response.headers.set('Location', redirectUrl.toString());

    // Optionally persist integration status for admin UI
    try {
      const app = getAdminApp();
      if (app) {
        const db = getDatabase(app);
        await db.ref(`admin/integrations/${adminUid}/twitter`).set({
          connected: true,
          admin_uid: adminUid,
          screen_name: username || null,
          updatedAt: Date.now(),
        });
      }
    } catch (e) {
      console.warn('Failed to persist Twitter integration status:', e);
    }

    return response;

  } catch (error) {
    console.error('Error exchanging Twitter auth code for token:', error);
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'twitter');
    url.searchParams.set('error', 'twitter_server_error');
    url.searchParams.set('message', 'Failed to authenticate with Twitter');
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('twitter_code_verifier');
    resp.cookies.delete('twitter_state');
    return resp;
  }
}
