import { NextRequest, NextResponse } from 'next/server';
import { getBraintreeGateway } from '@/lib/braintree-gateway';
import { getAdminAuth } from '@/lib/firebase-admin';

/**
 * POST /api/braintree/token
 * Gera um client token para o Braintree Drop-in UI
 * Requer autenticação Firebase
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token de autenticação não fornecido' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let userId: string;

    try {
      const auth = getAdminAuth();
      if (!auth) {
        throw new Error('Firebase Auth não inicializado');
      }
      
      const decodedToken = await auth.verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Obter gateway Braintree
    const gateway = getBraintreeGateway();

    // Gerar client token
    // Você pode associar o customerId aqui se já tiver cadastrado o cliente
    const response = await gateway.clientToken.generate({
      // customerId: userId, // Descomente se quiser associar ao usuário
    });

    return NextResponse.json({
      success: true,
      clientToken: response.clientToken,
      userId,
    });

  } catch (error: any) {
    console.error('Erro ao gerar Braintree client token:', error);
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
 * GET /api/braintree/token
 * Versão GET para compatibilidade (menos segura, use POST preferencialmente)
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
