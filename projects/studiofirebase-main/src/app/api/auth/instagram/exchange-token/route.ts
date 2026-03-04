import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { code } = body;

        if (!code) {
            return NextResponse.json(
                { error_message: 'Código de autorização é obrigatório' },
                { status: 400 }
            );
        }

        const INSTAGRAM_APP_ID = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
        const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
        const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/instagram/callback`;

        if (!INSTAGRAM_APP_ID || !INSTAGRAM_APP_SECRET) {
            console.error('[Instagram Exchange Token] Credenciais não configuradas');
            return NextResponse.json(
                { error_message: 'Credenciais do Instagram não configuradas' },
                { status: 500 }
            );
        }

        console.log('[Instagram Exchange Token] Trocando código por token...');

        // Fazer requisição para o Instagram API
        const formData = new URLSearchParams({
            client_id: INSTAGRAM_APP_ID,
            client_secret: INSTAGRAM_APP_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI,
            code: code,
        });

        const response = await fetch('https://api.instagram.com/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('[Instagram Exchange Token] Erro na API:', error);
            return NextResponse.json(error, { status: response.status });
        }

        const data = await response.json();
        console.log('[Instagram Exchange Token] Token obtido com sucesso');

        return NextResponse.json(data);
    } catch (error) {
        console.error('[Instagram Exchange Token] Erro:', error);
        return NextResponse.json(
            {
                error_message: error instanceof Error ? error.message : 'Erro desconhecido',
            },
            { status: 500 }
        );
    }
}
