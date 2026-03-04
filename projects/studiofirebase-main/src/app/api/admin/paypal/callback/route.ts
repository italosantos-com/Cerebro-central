
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { verifySignedOAuthAdminState } from '@/lib/oauth-admin-state';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state');
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Retrieve state from cookies
  const savedState = request.cookies.get('paypal_state')?.value;

  if (error) {
    // PayPal returned an error
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'paypal');
    url.searchParams.set('error', 'paypal_auth_failed');
    url.searchParams.set('message', `PayPal error: ${error}`);
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('paypal_state');
    return resp;
  }

  if (!state || !code || !savedState || state !== savedState) {
    // Redirect back to popup callback with error so UI can show toast
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'paypal');
    url.searchParams.set('error', 'paypal_auth_failed');
    url.searchParams.set('message', 'Invalid authentication callback');
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('paypal_state');
    return resp;
  }

  const verifiedState = verifySignedOAuthAdminState('paypal', state);
  if (!verifiedState.valid) {
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'paypal');
    url.searchParams.set('error', 'paypal_auth_failed');
    url.searchParams.set('message', `Invalid state: ${verifiedState.reason}`);
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('paypal_state');
    return resp;
  }

  const adminUid = verifiedState.uid;

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'paypal');
    url.searchParams.set('error', 'paypal_config_error');
    url.searchParams.set('message', 'PayPal credentials not configured');
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('paypal_state');
    return resp;
  }

  try {
    // Exchange code for access token
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const callbackUrl = process.env.PAYPAL_CALLBACK_URL || new URL('/api/admin/paypal/callback', base).toString();

    const tokenUrl = `https://api-m.sandbox.paypal.com/v1/oauth2/token`;
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('PayPal token exchange failed:', tokenData);
      const url = new URL('/auth/callback', base);
      url.searchParams.set('platform', 'paypal');
      url.searchParams.set('error', 'paypal_token_exchange_failed');
      url.searchParams.set('message', 'Failed to exchange authorization code');
      const resp = NextResponse.redirect(url);
      resp.cookies.delete('paypal_state');
      return resp;
    }

    const { refresh_token, access_token, expires_in } = tokenData;

    // Get merchant info
    const userInfoUrl = `https://api-m.sandbox.paypal.com/v1/identity/oauth2/userinfo?schema=paypalv1.1`;
    const userResponse = await fetch(userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    const userData = await userResponse.json();

    // Store in Firebase Realtime Database
    const adminApp = getAdminApp();
    if (adminApp) {
      const db = getDatabase(adminApp);
      const integrationsRef = db.ref(`admin/integrations/${adminUid}/paypal`);
      await integrationsRef.set({
        connected: true,
        admin_uid: adminUid,
        refresh_token,
        access_token,
        expires_in,
        merchant_id: userData.user_id,
        email: userData.email,
        name: userData.name,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Redirect back to success callback
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'paypal');
    url.searchParams.set('success', 'true');
    url.searchParams.set('username', userData.name);
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('paypal_state');
    return resp;

  } catch (error) {
    console.error('PayPal callback error:', error);
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'paypal');
    url.searchParams.set('error', 'paypal_server_error');
    url.searchParams.set('message', 'Server error during PayPal authentication');
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('paypal_state');
    return resp;
  }
}
