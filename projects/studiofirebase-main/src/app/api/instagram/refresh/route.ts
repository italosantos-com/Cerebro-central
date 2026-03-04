import { NextResponse } from 'next/server';

/**
 * API Route: Instagram Token Refresh
 * Endpoint para renovar tokens de acesso do Instagram
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { refresh_token } = body;

        if (!refresh_token) {
            return NextResponse.json(
                { error: 'Refresh token é obrigatório' },
                { status: 400 }
            );
        }

        // TODO: Implementar lógica de refresh do token do Instagram
        // Por enquanto, retorna erro não implementado
        return NextResponse.json(
            { error: 'Funcionalidade de refresh do Instagram não implementada' },
            { status: 501 }
        );

    } catch (error) {
        console.error('[Instagram Refresh] Erro:', error);
        return NextResponse.json(
            { error: 'Erro ao renovar token do Instagram' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json(
        { error: 'Método não permitido. Use POST.' },
        { status: 405 }
    );
}
