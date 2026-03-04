import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { getGoogleCalendarAuthUrl } from '@/lib/calendar/google-calendar';
import { getBaseUrl } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const authResult = await requireAdminApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const from = request.nextUrl.searchParams.get('from') || 'calendar';
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set('google_calendar_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600
  });
  cookieStore.set('google_calendar_oauth_from', from, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600
  });

  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${getBaseUrl()}/api/admin/calendar/google/callback`;
  const authUrl = getGoogleCalendarAuthUrl(state, redirectUri);

  return NextResponse.redirect(authUrl);
}
