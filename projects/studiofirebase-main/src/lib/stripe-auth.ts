import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export interface StripeAuthHelper {
  isAuthenticated: boolean;
  stripeUserId: string | null;
  accessToken: string | null;
}

/**
 * Helper function to check if user is authenticated with Stripe
 * Use this in API routes to protect endpoints that require Stripe authentication
 */
export async function getStripeAuth(): Promise<StripeAuthHelper> {
  try {
    const cookieStore = await cookies();
    const stripeUserId = cookieStore.get('stripe_user_id')?.value || null;
    const accessToken = cookieStore.get('stripe_access_token')?.value || null;

    return {
      isAuthenticated: !!(stripeUserId && accessToken),
      stripeUserId,
      accessToken
    };
  } catch (error: unknown) {
    console.error('Error getting Stripe auth:', error);
    return {
      isAuthenticated: false,
      stripeUserId: null,
      accessToken: null
    };
  }
}

/**
 * Middleware helper to protect API routes
 * Returns 401 response if not authenticated
 */
export async function requireStripeAuth(
  request: NextRequest,
  handler: (auth: StripeAuthHelper) => Promise<NextResponse>
): Promise<NextResponse> {
  const auth = await getStripeAuth();

  if (!auth.isAuthenticated) {
    return NextResponse.json(
      { error: 'Não autenticado com Stripe' },
      { status: 401 }
    );
  }

  return handler(auth);
}

/**
 * Refresh Stripe access token using refresh token
 */
export async function refreshStripeToken(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('stripe_refresh_token')?.value;

    if (!refreshToken) {
      return false;
    }

    const response = await stripe.oauth.token({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    // Update access token in cookies
    cookieStore.set('stripe_access_token', response.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    });

    return true;
  } catch (error: unknown) {
    console.error('Error refreshing Stripe token:', error);
    return false;
  }
}
