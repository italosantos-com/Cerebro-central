// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

const getStripeClient = () => {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key is not configured. Set STRIPE_SECRET_KEY before calling this endpoint.');
  }
  return new Stripe(STRIPE_SECRET_KEY);
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Missing authorization code' },
        { status: 400 }
      );
    }

    // Exchange authorization code for access token
    const stripe = getStripeClient();

    const result = await stripe.oauth
      .token({
        grant_type: 'authorization_code',
        code,
      })
      .catch((err: unknown) => {
        console.error('Stripe token exchange error:', err);
        throw new Error(`Token exchange failed: ${(err as any)?.message}`);
      });

    // Ensure stripe_user_id is a string
    const stripeUserId = typeof result?.stripe_user_id === 'string' ? result.stripe_user_id : String(result?.stripe_user_id);

    // Retrieve the connected account details
    const account = await stripe.accounts
      .retrieve(stripeUserId)
      .catch((err: unknown) => {
        console.error('Stripe account retrieval error:', err);
        throw new Error(`Account retrieval failed: ${(err as any)?.message}`);
      });

    // Analyze account status
    const accountAnalysis = {
      hasConnectedAccount: !!account?.id,
      accountId: account?.id,
      hasCompletedProcess: account?.details_submitted,
      isValid: account?.charges_enabled && account?.payouts_enabled,
      displayName:
        account?.settings?.dashboard?.display_name ||
        (account as any)?.display_name ||
        null,
      country: account?.country,
      currency: account?.default_currency,
    };

    const shouldAllowUnlink =
      accountAnalysis?.hasConnectedAccount &&
      (!accountAnalysis?.isValid ||
        !accountAnalysis?.hasCompletedProcess ||
        !accountAnalysis?.displayName);

    return NextResponse.json({
      account,
      oauth: result,
      accountAnalysis,
      shouldAllowUnlink,
    });

  } catch (error) {
    console.error('Stripe verify error:', error);
    return NextResponse.json(
      {
        error: 'stripe_verification_failed',
        message: error instanceof Error ? error.message : 'Failed to verify Stripe account'
      },
      { status: 500 }
    );
  }
}
