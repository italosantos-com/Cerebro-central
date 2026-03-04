import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // Clear all Stripe-related cookies
    cookieStore.delete('stripe_user_id');
    cookieStore.delete('stripe_access_token');
    cookieStore.delete('stripe_refresh_token');

    return NextResponse.json({ success: true, message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro ao fazer logout do Stripe:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer logout' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // Clear all Stripe-related cookies
    cookieStore.delete('stripe_user_id');
    cookieStore.delete('stripe_access_token');
    cookieStore.delete('stripe_refresh_token');

    // Redirect to home page
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('Erro ao fazer logout do Stripe:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
