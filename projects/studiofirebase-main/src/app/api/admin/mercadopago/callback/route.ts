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
  const savedState = request.cookies.get('mercadopago_state')?.value;

  if (error) {
    // MercadoPago returned an error
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'mercadopago');
    url.searchParams.set('error', 'mercadopago_auth_failed');
    url.searchParams.set('message', `MercadoPago error: ${error}`);
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('mercadopago_state');
    return resp;
  }

  if (!state || !savedState || state !== savedState || !code) {
    // Redirect back to popup callback with error so UI can show toast
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'mercadopago');
    url.searchParams.set('error', 'mercadopago_auth_failed');
    url.searchParams.set('message', 'Invalid authentication callback');
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('mercadopago_state');
    return resp;
  }

  const verifiedState = verifySignedOAuthAdminState('mercadopago', state);
  if (!verifiedState.valid) {
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'mercadopago');
    url.searchParams.set('error', 'mercadopago_auth_failed');
    url.searchParams.set('message', `Invalid state: ${verifiedState.reason}`);
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('mercadopago_state');
    return resp;
  }

  const adminUid = verifiedState.uid;

  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'mercadopago');
    url.searchParams.set('error', 'mercadopago_config_error');
    url.searchParams.set('message', 'MercadoPago credentials not configured');
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('mercadopago_state');
    return resp;
  }

  try {
    // Exchange code for access token
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const callbackUrl = process.env.MERCADOPAGO_CALLBACK_URL || new URL('/api/admin/mercadopago/callback', base).toString();
    const tokenUrl = 'https://api.mercadopago.com/oauth/token';
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_secret: clientSecret,
        client_id: clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('MercadoPago token exchange failed:', tokenData);
      const url = new URL('/auth/callback', base);
      url.searchParams.set('platform', 'mercadopago');
      url.searchParams.set('error', 'mercadopago_token_exchange_failed');
      url.searchParams.set('message', 'Failed to exchange authorization code');
      const resp = NextResponse.redirect(url);
      resp.cookies.delete('mercadopago_state');
      return resp;
    }

    const { access_token, refresh_token, public_key, user_id } = tokenData;

    // Get user info
    const userResponse = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    const userData = await userResponse.json();

    // Store in Firebase Realtime Database
    const adminApp = getAdminApp();
    if (adminApp) {
      const db = getDatabase(adminApp);
      const integrationsRef = db.ref(`admin/integrations/${adminUid}/mercadopago`);
      await integrationsRef.set({
        connected: true,
        admin_uid: adminUid,
        access_token,
        refresh_token,
        public_key,
        user_id,
        merchant_id: userData.id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Redirect back to success callback
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'mercadopago');
    url.searchParams.set('success', 'true');
    url.searchParams.set('username', `${userData.first_name} ${userData.last_name}`);
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('mercadopago_state');
    return resp;

  } catch (error) {
    console.error('MercadoPago callback error:', error);
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'mercadopago');
    url.searchParams.set('error', 'mercadopago_server_error');
    url.searchParams.set('message', 'Server error during MercadoPago authentication');
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('mercadopago_state');
    return resp;
  }
}