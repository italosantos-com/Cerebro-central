import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.STRIPE_CLIENT_ID;
    const redirectUri = process.env.STRIPE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/api/stripe/callback`;
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'STRIPE_CLIENT_ID não configurado' },
        { status: 500 }
      );
    }

    // Generate state token for CSRF protection
    const state = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    
    // Store state in cookie
    const cookieStore = await cookies();
    cookieStore.set('stripe_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/'
    });

    // Build Stripe OAuth URL
    const stripeAuthUrl = new URL('https://connect.stripe.com/oauth/authorize');
    stripeAuthUrl.searchParams.append('response_type', 'code');
    stripeAuthUrl.searchParams.append('client_id', clientId);
    stripeAuthUrl.searchParams.append('scope', 'read_write');
    stripeAuthUrl.searchParams.append('redirect_uri', redirectUri);
    stripeAuthUrl.searchParams.append('state', state);

    return NextResponse.redirect(stripeAuthUrl.toString());
  } catch (error) {
    console.error('Erro ao iniciar OAuth do Stripe:', error);
    return NextResponse.json(
      { error: 'Erro ao iniciar autenticação' },
      { status: 500 }
    );
  }
}
