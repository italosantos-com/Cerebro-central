import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { access_token } = body;

    if (!access_token) {
      return NextResponse.json(
        { error_message: 'Access token é obrigatório' },
        { status: 400 }
      );
    }

    const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;

    if (!INSTAGRAM_APP_SECRET) {
      console.error('[Instagram Long-Lived Token] App secret não configurado');
      return NextResponse.json(
        { error_message: 'Credenciais do Instagram não configuradas' },
        { status: 500 }
      );
    }

    console.log('[Instagram Long-Lived Token] Obtendo token de longa duração...');

    // Fazer requisição para o Instagram API
    const params = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: INSTAGRAM_APP_SECRET,
      access_token: access_token,
    });

    const response = await fetch(
      `https://graph.instagram.com/access_token?${params.toString()}`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[Instagram Long-Lived Token] Erro na API:', error);
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    console.log('[Instagram Long-Lived Token] Token de longa duração obtido com sucesso');
    console.log('[Instagram Long-Lived Token] Expira em:', data.expires_in, 'segundos');

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Instagram Long-Lived Token] Erro:', error);
    return NextResponse.json(
      {
        error_message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
