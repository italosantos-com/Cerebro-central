import { NextRequest, NextResponse } from 'next/server';
import { getBraintreeGateway } from '@/lib/braintree-gateway';
import { getAdminAuth } from '@/lib/firebase-admin';

/**
 * POST /api/braintree/client-token-google-pay
 * Gera um client token Braintree especificamente para Google Pay
 */
export async function POST(request: NextRequest) {
    try {
        // Verificar autenticação (opcional, mas recomendado)
        const authHeader = request.headers.get('authorization');

        let userId: string | undefined;

        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split('Bearer ')[1];
            try {
                const auth = getAdminAuth();
                if (auth) {
                    const decodedToken = await auth.verifyIdToken(token);
                    userId = decodedToken.uid;
                }
            } catch (error) {
                console.warn('Token inválido, gerando client token sem usuário:', error);
            }
        }

        // Obter gateway Braintree
        const gateway = getBraintreeGateway();

        // Gerar client token
        const response = await gateway.clientToken.generate({
            // Se tiver customerId, pode associar aqui
            // customerId: userId,
        });

        console.log('✅ [Braintree] Client token gerado para Google Pay');

        return NextResponse.json({
            success: true,
            clientToken: response.clientToken,
            userId: userId || 'anonymous',
        });

    } catch (error: any) {
        console.error('❌ [Braintree] Erro ao gerar client token:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Internal Server Error',
                message: error.message || 'Erro ao gerar token de pagamento',
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/braintree/client-token-google-pay
 * Versão GET para compatibilidade
 */
export async function GET(request: NextRequest) {
    return POST(request);
}
