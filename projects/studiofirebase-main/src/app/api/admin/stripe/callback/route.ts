
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { verifySignedOAuthAdminState } from '@/lib/oauth-admin-state';

function buildCallbackRedirect(request: NextRequest, error: string, message: string) {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
  const url = new URL('/auth/callback', base);
  url.searchParams.set('platform', 'stripe');
  url.searchParams.set('error', error);
  url.searchParams.set('message', message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state');
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Retrieve state from cookies
  const savedState = request.cookies.get('stripe_state')?.value;

  if (error) {
    // Stripe returned an error
    const resp = buildCallbackRedirect(request, 'stripe_auth_failed', `Stripe error: ${error}`);
    resp.cookies.delete('stripe_state');
    return resp;
  }

  if (!state || !code || !savedState || state !== savedState) {
    // Redirect back to popup callback with error so UI can show toast
    const resp = buildCallbackRedirect(request, 'stripe_auth_failed', 'Invalid authentication callback');
    resp.cookies.delete('stripe_state');
    return resp;
  }

  const verifiedState = verifySignedOAuthAdminState('stripe', state);
  if (!verifiedState.valid) {
    const resp = buildCallbackRedirect(request, 'stripe_auth_failed', `Invalid state: ${verifiedState.reason}`);
    resp.cookies.delete('stripe_state');
    return resp;
  }
  const adminUid = verifiedState.uid;

  const clientId = process.env.STRIPE_CLIENT_ID || process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID;
  const clientSecret = process.env.STRIPE_SECRET_KEY;

  if (!clientId || !clientSecret) {
    const resp = buildCallbackRedirect(request, 'stripe_config_error', 'Stripe credentials not configured');
    resp.cookies.delete('stripe_state');
    return resp;
  }

  try {
    // Exchange code for access token
    const tokenUrl = 'https://connect.stripe.com/oauth/token';
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clientSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Stripe token exchange failed:', tokenData);
      const resp = buildCallbackRedirect(request, 'stripe_token_exchange_failed', 'Failed to exchange authorization code');
      resp.cookies.delete('stripe_state');
      return resp;
    }

    const { access_token, refresh_token, stripe_user_id, stripe_publishable_key } = tokenData;

    // Retrieve and analyze the connected Stripe account
    const Stripe = (await import('stripe')).default;
    const stripeClient = new Stripe(clientSecret, {
      apiVersion: '2023-10-16',
    });
    const account = await stripeClient.accounts.retrieve(stripe_user_id).catch((err: any) => {
      console.error('Failed to retrieve Stripe account:', err);
      return null;
    });

    // Analyze account status
    const accountAnalysis = {
      hasConnectedAccount: !!account?.id,
      accountId: account?.id,
      hasCompletedProcess: account?.details_submitted,
      isValid: account?.charges_enabled && account?.payouts_enabled,
      displayName:
        account?.settings?.dashboard?.display_name ||
        null,
      country: account?.country,
      currency: account?.default_currency,
    };

    const shouldAllowUnlink =
      accountAnalysis?.hasConnectedAccount &&
      (!accountAnalysis?.isValid ||
        !accountAnalysis?.hasCompletedProcess ||
        !accountAnalysis?.displayName);

    // Store in Firebase Realtime Database
    const adminApp = getAdminApp();
    if (adminApp) {
      const db = getDatabase(adminApp);
      const integrationsRef = db.ref(`admin/integrations/${adminUid}/stripe`);
      await integrationsRef.set({
        connected: true,
        access_token,
        refresh_token,
        stripe_user_id,
        stripe_publishable_key,
        connected_at: new Date().toISOString(),
        // Add account analysis
        account_analysis: accountAnalysis,
        should_allow_unlink: shouldAllowUnlink,
      });
    }

    // Redirect back to success callback
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'stripe');
    url.searchParams.set('success', 'true');
    url.searchParams.set('username', stripe_user_id);
    const resp = NextResponse.redirect(url);
    resp.cookies.delete('stripe_state');
    return resp;

  } catch (error) {
    console.error('Stripe callback error:', error);
    const resp = buildCallbackRedirect(request, 'stripe_server_error', 'Server error during Stripe authentication');
    resp.cookies.delete('stripe_state');
    return resp;
  }
}
