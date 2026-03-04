import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { verifySignedOAuthAdminState } from '@/lib/oauth-admin-state';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state');
  const code = searchParams.get('code');
  const error = searchParams.get('error');
    console.log('[Facebook Callback] Iniciando callback Facebook/Meta AI');
    console.log('[Facebook Callback] Params:', { state, code, error });

  // Retrieve state from cookies
  const savedState = request.cookies.get('facebook_state')?.value;
    console.log('[Facebook Callback] Saved state:', savedState);

  if (error) {
    // Facebook returned an error
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'facebook');
    url.searchParams.set('error', 'facebook_auth_failed');
    url.searchParams.set('message', `Facebook error: ${error}`);
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('facebook_state');
    return resp;
  }

  if (!state || !code || !savedState || state !== savedState) {
    // Redirect back to popup callback with error so UI can show toast
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'facebook');
    url.searchParams.set('error', 'facebook_auth_failed');
    url.searchParams.set('message', 'Invalid authentication callback');
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('facebook_state');
    return resp;
  }

  const verifiedState = verifySignedOAuthAdminState('facebook', state);
  if (!verifiedState.valid) {
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'facebook');
    url.searchParams.set('error', 'facebook_auth_failed');
    url.searchParams.set('message', `Invalid state: ${verifiedState.reason}`);
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('facebook_state');
    return resp;
  }

  const adminUid = verifiedState.uid;

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'facebook');
    url.searchParams.set('error', 'facebook_config_error');
    url.searchParams.set('message', 'Facebook credentials not configured');
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('facebook_state');
    return resp;
  }

  try {
    // Exchange code for access token
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const callbackUrl = process.env.FACEBOOK_CALLBACK_URL || new URL('/api/admin/facebook/callback', base).toString();

    const tokenUrl = new URL('https://graph.facebook.com/v23.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('redirect_uri', callbackUrl);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();
      console.log('[Facebook Callback] Token URL:', tokenUrl.toString());
      console.log('[Facebook Callback] Token data:', tokenData);

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Facebook token exchange failed:', tokenData);
      const url = new URL('/auth/callback', base);
      url.searchParams.set('platform', 'facebook');
      url.searchParams.set('error', 'facebook_token_exchange_failed');
      url.searchParams.set('message', 'Failed to exchange authorization code');
      const resp = NextResponse.redirect(url);
      resp.cookies.delete('facebook_state');
      return resp;
    }

    const { access_token, expires_in } = tokenData;

    // Fetch user info
    const userResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${access_token}`);
    const userData = await userResponse.json();
      console.log('[Facebook Callback] User info URL:', `https://graph.facebook.com/me?fields=id,name,email&access_token=${access_token}`);
      console.log('[Facebook Callback] User data:', userData);

    if (!userResponse.ok) {
      console.error('Facebook user info fetch failed:', userData);
      const url = new URL('/auth/callback', base);
      url.searchParams.set('platform', 'facebook');
      url.searchParams.set('error', 'facebook_user_info_failed');
      url.searchParams.set('message', 'Failed to fetch user information');
      const resp = NextResponse.redirect(url);
      resp.cookies.delete('facebook_state');
      return resp;
    }

    // Calcular data de expiração do token
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + parseInt(expires_in, 10));
      console.log('[Facebook Callback] Token expires at:', expiresAt.toISOString());

    // Store in Firebase Realtime Database
    const adminApp = getAdminApp();
    if (adminApp) {
      const db = getDatabase(adminApp);
      const integrationsRef = db.ref(`admin/integrations/${adminUid}/facebook`);
      await integrationsRef.set({
        connected: true,
        admin_uid: adminUid,
        access_token,
        expires_in,
        expires_at: expiresAt.toISOString(),
        user_id: userData.id,
        name: userData.name,
        email: userData.email,
        connected_at: new Date().toISOString(),
        // Campos para refresh token (futuro)
        refresh_token: tokenData.refresh_token || null,
        refresh_token_expires_in: tokenData.refresh_token_expires_in || null,
        updated_at: new Date().toISOString(),
      });
        console.log('[Facebook Callback] Salvando integração em:', `admin/integrations/${adminUid}/facebook`);
        console.log('[Facebook Callback] Integração salva com sucesso.');
    }

    // Redirect back to success callback
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'facebook');
    url.searchParams.set('success', 'true');
    url.searchParams.set('username', userData.name);
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('facebook_state');
    return resp;

  } catch (error) {
    console.error('Facebook callback error:', error);
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'facebook');
    url.searchParams.set('error', 'facebook_server_error');
    url.searchParams.set('message', 'Server error during Facebook authentication');
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('facebook_state');
    return resp;
  }
}