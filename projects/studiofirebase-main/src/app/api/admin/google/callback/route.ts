import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { verifySignedOAuthAdminState } from '@/lib/oauth-admin-state';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state');
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Retrieve state from cookies
  const savedState = request.cookies.get('google_state')?.value;

  if (error) {
    // Google returned an error
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'google');
    url.searchParams.set('error', 'google_auth_failed');
    url.searchParams.set('message', `Google error: ${error}`);
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('google_state');
    return resp;
  }

  if (!state || !code || !savedState || state !== savedState) {
    // Redirect back to popup callback with error so UI can show toast
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'google');
    url.searchParams.set('error', 'google_auth_failed');
    url.searchParams.set('message', 'Invalid authentication callback');
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('google_state');
    return resp;
  }

  const verifiedState = verifySignedOAuthAdminState('google', state);
  if (!verifiedState.valid) {
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'google');
    url.searchParams.set('error', 'google_auth_failed');
    url.searchParams.set('message', `Invalid state: ${verifiedState.reason}`);
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('google_state');
    return resp;
  }

  const adminUid = verifiedState.uid;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'google');
    url.searchParams.set('error', 'google_config_error');
    url.searchParams.set('message', 'Google credentials not configured');
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('google_state');
    return resp;
  }

  try {
    // Exchange code for access token
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL || new URL('/api/admin/google/callback', base).toString();
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Google token exchange failed:', tokenData);
      const url = new URL('/auth/callback', base);
      url.searchParams.set('platform', 'google');
      url.searchParams.set('error', 'google_token_exchange_failed');
      url.searchParams.set('message', 'Failed to exchange authorization code');
      const resp = NextResponse.redirect(url);
      resp.cookies.delete('google_state');
      return resp;
    }

    const { access_token, refresh_token, expires_in, id_token } = tokenData;

    // Decode ID token to get user info
    const idTokenParts = id_token.split('.');
    const payload = JSON.parse(Buffer.from(idTokenParts[1], 'base64').toString());

    // Store in Firebase Realtime Database
    const adminApp = getAdminApp();
    if (adminApp) {
      const db = getDatabase(adminApp);
      const integrationsRef = db.ref(`admin/integrations/${adminUid}/google`);
      await integrationsRef.set({
        connected: true,
        admin_uid: adminUid,
        access_token,
        refresh_token,
        expires_in,
        id_token,
        user_id: payload.sub,
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Store in Firestore admin document (used by YouTube-related APIs in app)
    const adminDb = getAdminDb();
    if (adminDb) {
      await adminDb.collection('admins').doc(adminUid).set(
        {
          google: {
            connected: true,
            accessToken: access_token,
            refreshToken: refresh_token || null,
            expiresIn: expires_in,
            connectedAt: new Date().toISOString(),
            email: payload.email || null,
            name: payload.name || null,
          },
          youtube: {
            accessToken: access_token,
            refreshToken: refresh_token || null,
            connectedAt: new Date().toISOString(),
            accountEmail: payload.email || null,
          },
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    // Redirect back to success callback
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'google');
    url.searchParams.set('success', 'true');
    url.searchParams.set('username', payload.name);
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('google_state');
    return resp;

  } catch (error) {
    console.error('Google callback error:', error);
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'google');
    url.searchParams.set('error', 'google_server_error');
    url.searchParams.set('message', 'Server error during Google authentication');
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('google_state');
    return resp;
  }
}