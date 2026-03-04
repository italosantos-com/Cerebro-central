import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const stripeUserId = cookieStore.get('stripe_user_id')?.value;
    const hasAccessToken = !!cookieStore.get('stripe_access_token')?.value;

    return NextResponse.json({
      isAuthenticated: !!stripeUserId && hasAccessToken,
      stripeUserId: stripeUserId || null
    });
  } catch (error) {
    console.error('Erro ao verificar status de autenticação:', error);
    return NextResponse.json(
      { isAuthenticated: false, stripeUserId: null },
      { status: 500 }
    );
  }
}
