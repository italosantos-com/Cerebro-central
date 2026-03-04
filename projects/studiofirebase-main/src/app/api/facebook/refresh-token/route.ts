import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    // Facebook long-lived token refresh
    const configRef = db.collection('config').doc('facebook');
    const configSnap = await configRef.get();
    const accessToken = configSnap.data()?.accessToken;
    const clientSecret = process.env.FACEBOOK_APP_SECRET;

    if (!accessToken || !clientSecret) {
      return NextResponse.json({ error: 'Token ou segredo não configurado' }, { status: 400 });
    }

    const refreshUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${clientSecret}&fb_exchange_token=${accessToken}`;
    const refreshResponse = await fetch(refreshUrl);
    if (!refreshResponse.ok) {
      const errorData = await refreshResponse.json();
      throw new Error(errorData.error?.message || 'Erro ao renovar token');
    }
    const refreshData = await refreshResponse.json();
    const newAccessToken = refreshData.access_token;
    const expiresIn = refreshData.expires_in;
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

    await configRef.set({
      accessToken: newAccessToken,
      tokenExpiry: tokenExpiry.toISOString(),
      lastRefresh: new Date().toISOString()
    });

    return NextResponse.json({ success: true, accessToken: newAccessToken, expiresIn });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
