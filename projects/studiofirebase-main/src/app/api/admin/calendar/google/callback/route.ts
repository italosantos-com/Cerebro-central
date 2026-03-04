import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { exchangeGoogleCalendarCode } from '@/lib/calendar/google-calendar';
import { getAdminDb } from '@/lib/firebase-admin';
import { getBaseUrl } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const authResult = await requireAdminApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const cookieStore = await cookies();
  const storedState = cookieStore.get('google_calendar_oauth_state')?.value;
  const oauthFrom = cookieStore.get('google_calendar_oauth_from')?.value;
  cookieStore.set('google_calendar_oauth_state', '', { path: '/', maxAge: 0 });
  cookieStore.set('google_calendar_oauth_from', '', { path: '/', maxAge: 0 });

  const successPath = oauthFrom === 'integrations' ? '/admin/integrations?google=connected' : '/admin/calendar?google=connected';
  const errorBasePath = oauthFrom === 'integrations' ? '/admin/integrations' : '/admin/calendar';

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`${errorBasePath}?error=${encodeURIComponent(error)}`, request.url));
  }

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(new URL(`${errorBasePath}?error=oauth_state`, request.url));
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.redirect(new URL(`${errorBasePath}?error=db`, request.url));
  }

  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${getBaseUrl()}/api/admin/calendar/google/callback`;
  const tokens = await exchangeGoogleCalendarCode(code, redirectUri);

  const docRef = adminDb.collection('admins').doc(authResult.uid).collection('integrations').doc('calendar');
  await docRef.set(
    {
      google: {
        connected: true,
        calendarId: 'primary',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        updatedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );

  return NextResponse.redirect(new URL(successPath, request.url));
}
