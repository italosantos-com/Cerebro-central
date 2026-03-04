import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { createSignedOAuthAdminState } from '@/lib/oauth-admin-state';

export async function GET(req: NextRequest) {
    try {
          console.log('[Facebook Connect] Iniciando conexão Facebook/Meta AI');
    const authResult = await requireAdminApiAuth(req);
          console.log('[Facebook Connect] AuthResult:', authResult);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

        const appId = process.env.FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;
          console.log('[Facebook Connect] AppId:', appId, 'AppSecret:', !!appSecret);

        if (!appId || !appSecret) {
            console.error('Facebook credentials not configured');
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
                error: 'facebook_config_error',
                message: 'Facebook credentials not configured',
                platform: 'facebook'
              }, window.location.origin);
              window.close();
            }
          </script>
          <p>Facebook credentials not configured. This window will close automatically.</p>
        </body>
        </html>
      `;
            return new NextResponse(html, {
                headers: { 'Content-Type': 'text/html' },
            });
        }

        // Prefer an explicit FACEBOOK_CALLBACK_URL, otherwise derive from public base
        const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).toString();
        const callbackUrl = process.env.FACEBOOK_CALLBACK_URL || new URL('/api/admin/facebook/callback', base).toString();
          console.log('[Facebook Connect] Callback URL:', callbackUrl);

        // Generate state for CSRF protection
        const state = createSignedOAuthAdminState('facebook', authResult.uid);
          console.log('[Facebook Connect] State:', state);

        // Facebook OAuth URL
      const authUrl = new URL('https://www.facebook.com/v23.0/dialog/oauth');
          console.log('[Facebook Connect] Auth URL:', authUrl.toString());
        authUrl.searchParams.set('client_id', appId);
        authUrl.searchParams.set('redirect_uri', callbackUrl);
        authUrl.searchParams.set('scope', 'email,public_profile,pages_read_engagement,pages_show_list,instagram_basic,instagram_manage_insights');
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('state', state);

        const response = NextResponse.redirect(authUrl.toString());
        response.cookies.set('facebook_state', state, {
          httpOnly: true,
          path: '/',
          maxAge: 60 * 15,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        });

        return response;
    } catch (error) {
        console.error('Error generating Facebook auth link:', error, {
            FACEBOOK_APP_ID: !!process.env.FACEBOOK_APP_ID,
            FACEBOOK_CALLBACK_URL: process.env.FACEBOOK_CALLBACK_URL,
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
              error: 'facebook_server_error',
              message: 'Failed to connect with Facebook',
              platform: 'facebook'
            }, window.location.origin);
            window.close();
          }
        </script>
        <p>Failed to connect with Facebook. This window will close automatically.</p>
      </body>
      </html>
    `;
        return new NextResponse(html, {
            headers: { 'Content-Type': 'text/html' },
        });
    }
}