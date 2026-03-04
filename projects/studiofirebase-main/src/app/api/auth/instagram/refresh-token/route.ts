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

    console.log('[Instagram Refresh Token] Renovando token de longa duração...');

    // Fazer requisição para o Instagram API
    const params = new URLSearchParams({
      grant_type: 'ig_refresh_token',
      access_token: access_token,
    });

    const response = await fetch(
      `https://graph.instagram.com/refresh_access_token?${params.toString()}`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[Instagram Refresh Token] Erro na API:', error);
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    console.log('[Instagram Refresh Token] Token renovado com sucesso');
    console.log('[Instagram Refresh Token] Novo prazo de expiração:', data.expires_in, 'segundos');

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Instagram Refresh Token] Erro:', error);
    return NextResponse.json(
      {
        error_message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
