
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { createSignedOAuthAdminState } from '@/lib/oauth-admin-state';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

function buildPopupError(error: string, message: string) {
  const payload = { success: false, error, message, platform: 'stripe' };
  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Erro</title></head>
    <body>
      <script>
        (function () {
          var payload = ${JSON.stringify(payload)};
          if (window.opener) {
            window.opener.postMessage(payload, window.location.origin);
            window.close();
          }
        })();
      </script>
      <p>${message} Esta janela fechará automaticamente.</p>
    </body>
    </html>
  `;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
}

export async function GET(req: NextRequest) {
  try {
    let adminUid: string | null = null;
    const tokenFromQuery = req.nextUrl.searchParams.get('token');

    if (tokenFromQuery) {
      const adminAuth = getAdminAuth();
      const adminDb = getAdminDb();
      if (!adminAuth || !adminDb) {
        return buildPopupError('admin_auth_required', 'Firebase Admin não inicializado.');
      }

      try {
        const decoded = await adminAuth.verifyIdToken(tokenFromQuery);
        const uid = decoded?.uid;
        if (!uid) return buildPopupError('admin_auth_required', 'Token inválido.');

        const adminSnap = await adminDb.collection('admins').doc(uid).get();
        if (!adminSnap.exists) return buildPopupError('admin_auth_required', 'Usuário não é administrador.');

        const adminDoc = adminSnap.data() || {};
        if (adminDoc.status && adminDoc.status !== 'active') {
          return buildPopupError('admin_auth_required', 'Administrador inativo.');
        }

        adminUid = uid;
      } catch {
        return buildPopupError('admin_auth_required', 'Token inválido ou expirado.');
      }
    } else {
      const authResult = await requireAdminApiAuth(req);
      if (authResult instanceof NextResponse) {
        return buildPopupError('admin_auth_required', 'Autenticação de admin necessária.');
      }
      adminUid = authResult.uid;
    }

    const clientId = process.env.STRIPE_CLIENT_ID || process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID;

    if (!clientId) {
      console.error('Stripe client ID not configured');
      // Return HTML page that posts error message and closes
      return buildPopupError('stripe_config_error', 'Stripe client ID não configurado.');
    }

    // Prefer an explicit STRIPE_CALLBACK_URL, otherwise derive from public base
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).toString();
    const callbackUrl = process.env.STRIPE_CALLBACK_URL || new URL('/api/admin/stripe/callback', base).toString();

    // Generate state for CSRF protection
    const state = createSignedOAuthAdminState('stripe', adminUid);

    // Stripe OAuth URL
    const authUrl = new URL('https://connect.stripe.com/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('scope', 'read_write');
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('state', state);

    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set('stripe_state', state, { httpOnly: true, path: '/', maxAge: 60 * 15 });

    return response;
  } catch (error) {
    console.error('Error generating Stripe auth link:', error, {
      STRIPE_CLIENT_ID: !!process.env.STRIPE_CLIENT_ID,
      NEXT_PUBLIC_STRIPE_CLIENT_ID: !!process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID,
      STRIPE_CALLBACK_URL: process.env.STRIPE_CALLBACK_URL,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      origin: req.nextUrl.origin,
    });
    // Return HTML page that posts error message and closes
    return buildPopupError('stripe_server_error', 'Falha ao conectar com Stripe.');
  }
}
