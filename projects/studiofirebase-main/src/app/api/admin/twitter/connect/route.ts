
import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { createSignedOAuthAdminState } from '@/lib/oauth-admin-state';

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdminApiAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const clientId = process.env.TWITTER_CLIENT_ID
      || process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID
      || process.env.TWITTER_API_KEY;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET || process.env.TWITTER_API_SECRET;

    if (!clientId) {
      return NextResponse.json(
        { success: false, message: 'Twitter Client ID não configurado' },
        { status: 500 }
      );
    }

    const client = new TwitterApi({
      clientId,
      clientSecret: clientSecret || undefined,
    });

    // Prefer an explicit TWITTER_CALLBACK_URL, otherwise derive from public base
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).toString();
    const isLocal = req.nextUrl.hostname === 'localhost' || req.nextUrl.hostname === '127.0.0.1';
    const envCallback = process.env.TWITTER_CALLBACK_URL || process.env.NEXT_PUBLIC_TWITTER_CALLBACK_URL;
    const callbackUrl = (!isLocal && envCallback) ? envCallback : new URL('/api/admin/twitter/callback', base).toString();

    const signedState = createSignedOAuthAdminState('twitter', authResult.uid);

    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(callbackUrl, {
      scope: ['dm.read', 'dm.write', 'tweet.read', 'users.read', 'offline.access', 'media.read'],
      state: signedState,
    });

    // Store codeVerifier and state in session or temporary storage
    // For this example, we'll use a simple cookie-based session
    const response = NextResponse.redirect(url);
    response.cookies.set('twitter_code_verifier', codeVerifier, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 15,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    response.cookies.set('twitter_state', state, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 15,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    console.error('Error generating Twitter auth link:', error, {
      TWITTER_CLIENT_ID: !!(process.env.TWITTER_CLIENT_ID || process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID),
      TWITTER_CALLBACK_URL: process.env.TWITTER_CALLBACK_URL,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      origin: req.nextUrl.origin,
    });
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).toString();
    const url = new URL('/auth/callback', base);
    url.searchParams.set('platform', 'twitter');
    url.searchParams.set('error', 'twitter_server_error');
    url.searchParams.set('message', 'Failed to connect with Twitter');
    return NextResponse.redirect(url);
  }
}
