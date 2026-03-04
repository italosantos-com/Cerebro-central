import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

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

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const stripeUserId = cookieStore.get('stripe_user_id')?.value;
    const accessToken = cookieStore.get('stripe_access_token')?.value;

    if (!stripeUserId || !accessToken) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Create login link for Express Dashboard
    const stripe = getStripeClient();

    const loginLink = await stripe.accounts.createLoginLink(stripeUserId);

    return NextResponse.json({ 
      url: loginLink.url,
      created: loginLink.created
    });
  } catch (error) {
    console.error('Erro ao criar link de login:', error);
    return NextResponse.json(
      { error: 'Erro ao criar link de acesso ao dashboard' },
      { status: 500 }
    );
  }
}
