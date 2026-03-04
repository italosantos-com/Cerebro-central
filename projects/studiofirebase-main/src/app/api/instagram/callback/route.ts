import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return new NextResponse(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'INSTAGRAM_AUTH_ERROR',
                message: '${error}'
              }, '*');
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    if (!code) {
      return NextResponse.json({
        success: false,
        error: 'Código de autorização não encontrado'
      }, { status: 400 });
    }

    // Trocar código por access token
    const clientId = process.env.INSTAGRAM_APP_ID;
    const clientSecret = process.env.INSTAGRAM_APP_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/instagram/callback`;

    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(errorData.error_message || 'Erro ao obter token');
    }

    const tokenData = await tokenResponse.json();
    const shortLivedToken = tokenData.access_token;

    // Trocar short-lived token por long-lived token (60 dias)
    const longLivedResponse = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${shortLivedToken}`
    );

    if (!longLivedResponse.ok) {
      throw new Error('Erro ao obter token de longa duração');
    }

    const longLivedData = await longLivedResponse.json();
    const accessToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in; // segundos

    // Calcular data de expiração
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

    // Salvar no Firestore
    const configRef = db.collection('config').doc('instagram');
    await configRef.set({
      accessToken,
      tokenExpiry: tokenExpiry.toISOString(),
      lastRefresh: new Date().toISOString(),
      userId: tokenData.user_id
    });

    // Retornar página que envia mensagem para o opener
    return new NextResponse(`
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'INSTAGRAM_AUTH_SUCCESS'
            }, '*');
            window.close();
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error: any) {
    console.error('Erro no callback do Instagram:', error);

    return new NextResponse(`
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'INSTAGRAM_AUTH_ERROR',
              message: '${error.message}'
            }, '*');
            window.close();
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}
