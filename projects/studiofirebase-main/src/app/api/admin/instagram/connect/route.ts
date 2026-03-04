import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { createSignedOAuthAdminState } from '@/lib/oauth-admin-state';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdminApiAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Prefer Instagram/Facebook app credentials from env
    const appId = process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Erro de Configuração</title></head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                success: false,
                error: 'instagram_config_error',
                message: 'Instagram/Facebook credentials not configured',
                platform: 'instagram'
              }, window.location.origin);
              window.close();
            }
          </script>
          <p>Instagram/Facebook credentials not configured. This window will close automatically.</p>
        </body>
        </html>`;
      return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
    }

    // Use fixed callback URL as requested (do not derive from environment/domain)
    const callbackUrl = 'https://italosantos.com/api/admin/instagram/callback';

    // CSRF state
    const state = createSignedOAuthAdminState('instagram', authResult.uid);

    // IMPORTANT: Instagram Business permissions are granted via Facebook OAuth dialog
    // not instagram.com OAuth (used for Basic Display). We'll use the Facebook dialog here.
    const authUrl = new URL(process.env.INSTAGRAM_OAUTH_AUTHORIZE_URL || 'https://www.facebook.com/v23.0/dialog/oauth');
    authUrl.searchParams.set('client_id', appId);
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);

    // Default to the new instagram_business_* scopes; allow override via env if needed
    const defaultScopes = [
      'instagram_business_basic',
      'instagram_business_manage_messages',
      'instagram_business_manage_comments',
      'instagram_business_content_publish',
      'instagram_business_manage_insights',
      // Helpful to resolve the linked Page → IG business account
      'pages_show_list',
    ];

    // Some flows require page permissions to resolve IG business account; optionally include them
    const extraPageScopes = (process.env.INCLUDE_PAGE_SCOPES === 'true')
      ? ['pages_show_list', 'pages_read_engagement']
      : [];

    const scopes = (process.env.INSTAGRAM_SCOPES || [...defaultScopes, ...extraPageScopes].join(',')).toString();
    authUrl.searchParams.set('scope', scopes);

    // Support re-auth (force reauth) requests
    const urlParams = req.nextUrl.searchParams;
    const forceReauth = urlParams.get('force_reauth');
    if (forceReauth === 'true' || forceReauth === '1') {
      // Facebook dialog supports auth_type=rerequest for re-consent
      authUrl.searchParams.set('auth_type', 'rerequest');
      authUrl.searchParams.set('display', 'popup');
    }

    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set('instagram_state', state, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 15,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  } catch (error) {
    console.error('Error generating Instagram auth link:', error);
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Erro</title></head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              success: false,
              error: 'instagram_server_error',
              message: 'Failed to connect with Instagram',
              platform: 'instagram'
            }, window.location.origin);
            window.close();
          }
        </script>
        <p>Failed to connect with Instagram. This window will close automatically.</p>
      </body>
      </html>`;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
  }
}
