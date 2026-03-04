import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
let stripeClient: Stripe | null = null;

const getStripeClient = () => {
  if (!stripeClient) {
    if (!STRIPE_SECRET_KEY) {
      throw new Error('Stripe secret key is not configured. Set STRIPE_SECRET_KEY before calling this endpoint.');
    }
    stripeClient = new Stripe(STRIPE_SECRET_KEY);
  }
  return stripeClient;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Check for OAuth errors
    if (error) {
      console.error('Erro OAuth do Stripe:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/stripe-connect?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos' },
        { status: 400 }
      );
    }

    // Verify state token (CSRF protection)
    const cookieStore = await cookies();
    const storedState = cookieStore.get('stripe_oauth_state')?.value;
    
    if (!storedState || storedState !== state) {
      return NextResponse.json(
        { error: 'Token de estado inválido' },
        { status: 403 }
      );
    }

    // Clear state cookie
    cookieStore.delete('stripe_oauth_state');

    // Exchange authorization code for access token
    const stripe = getStripeClient();

    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code
    });

    if (!response?.stripe_user_id) {
      throw new Error('Stripe OAuth response is missing stripe_user_id.');
    }

    if (!response?.access_token) {
      throw new Error('Stripe OAuth response is missing access_token.');
    }

    // Store Stripe credentials in secure cookies
    cookieStore.set('stripe_user_id', response.stripe_user_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    });

    cookieStore.set('stripe_access_token', response.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    });

    if (response.refresh_token) {
      cookieStore.set('stripe_refresh_token', response.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/'
      });
    }

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/stripe-connect?success=true', request.url));
  } catch (error) {
    console.error('Erro no callback OAuth do Stripe:', error);
    return NextResponse.redirect(
      new URL('/stripe-connect?error=authentication_failed', request.url)
    );
  }
}
