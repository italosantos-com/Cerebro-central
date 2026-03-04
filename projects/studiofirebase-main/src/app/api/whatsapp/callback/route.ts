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
                type: 'WHATSAPP_AUTH_ERROR',
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

    // Trocar código por access token (exemplo fictício, ajuste conforme API real)
    const clientId = process.env.WHATSAPP_APP_ID;
    const clientSecret = process.env.WHATSAPP_APP_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/whatsapp/callback`;

    const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(errorData.error?.message || 'Erro ao obter token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in;

    // Calcular data de expiração
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

    // Salvar no Firestore
    const configRef = db.collection('config').doc('whatsapp');
    await configRef.set({
      accessToken,
      tokenExpiry: tokenExpiry.toISOString(),
      lastRefresh: new Date().toISOString()
    });

    // Retornar página que envia mensagem para o opener
    return new NextResponse(`
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'WHATSAPP_AUTH_SUCCESS'
            }, '*');
            window.close();
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error: any) {
    console.error('Erro no callback do WhatsApp:', error);

    return new NextResponse(`
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'WHATSAPP_AUTH_ERROR',
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
