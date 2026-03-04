import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { createSignedOAuthAdminState } from '@/lib/oauth-admin-state';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

async function resolveAdminUid(req: NextRequest): Promise<string | null> {
  const tokenFromQuery = req.nextUrl.searchParams.get('token');
  if (tokenFromQuery) {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    if (!adminAuth || !adminDb) return null;

    try {
      const decoded = await adminAuth.verifyIdToken(tokenFromQuery);
      const uid = decoded?.uid;
      if (!uid) return null;

      const adminSnap = await adminDb.collection('admins').doc(uid).get();
      if (!adminSnap.exists) return null;

      const adminDoc = adminSnap.data() || {};
      if (adminDoc.status && adminDoc.status !== 'active') return null;
      // Debug log: token, decoded payload, UID
      console.log('[Google Connect] Token recebido:', tokenFromQuery);
      console.log('[Google Connect] Payload decodificado:', decoded);
      console.log('[Google Connect] UID resolvido:', uid);
      return uid;
    } catch {
      console.error('[Google Connect] Erro ao verificar token:', error);
      return null;
    }
  }

  const authResult = await requireAdminApiAuth(req);
  if (authResult instanceof NextResponse) return null;
  // Debug log: authResult
  console.log('[Google Connect] AuthResult:', authResult);
  return authResult.uid;
}

export async function GET(req: NextRequest) {
  try {
    const adminUid = await resolveAdminUid(req);
    console.log('[Google Connect] UID final:', adminUid);
    if (!adminUid) {
      return NextResponse.json({ success: false, message: 'Autenticação admin obrigatória' }, { status: 401 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Google credentials not configured');
      // Return HTML page that posts error message and closes
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Erro de Configuração</title></head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                success: false,
                error: 'google_config_error',
                message: 'Google credentials not configured',
                platform: 'google'
              }, window.location.origin);
              window.close();
            }
          </script>
          <p>Google credentials not configured. This window will close automatically.</p>
        </body>
        </html>
      `;
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).toString();
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL || new URL('/api/admin/google/callback', base).toString();
    const state = createSignedOAuthAdminState('google', adminUid);

    // Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set(
      'scope',
      [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.settings.readonly',
        'https://www.googleapis.com/auth/photoslibrary.readonly',
        'https://www.googleapis.com/auth/drive.readonly'
      ].join(' ')
    );
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set('google_state', state, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 15,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    console.error('Error generating Google auth link:', error, {
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      origin: req.nextUrl.origin,
    });
    // Return HTML page that posts error message and closes
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Erro</title></head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              success: false,
              error: 'google_server_error',
              message: 'Failed to connect with Google',
              platform: 'google'
            }, window.location.origin);
            window.close();
          }
        </script>
        <p>Failed to connect with Google. This window will close automatically.</p>
      </body>
      </html>
    `;
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}