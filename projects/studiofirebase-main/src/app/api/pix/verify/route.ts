import { NextRequest, NextResponse } from 'next/server';
import { mercadopagoClient } from '@/lib/mercadopago-client';

interface VerifyPaymentRequest {
  paymentId: string;
  maxRetries?: number;
  delayMs?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { paymentId, maxRetries = 3, delayMs = 2000 }: VerifyPaymentRequest = await request.json();

    console.log('🔍 [PIX VERIFY] Verificando pagamento:', { paymentId, maxRetries, delayMs });

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID é obrigatório' },
        { status: 400 }
      );
    }

    try {
      const payment = await mercadopagoClient.getPayment(paymentId, maxRetries, delayMs);

      console.log('💰 [PIX VERIFY] Status do pagamento:', {
        id: payment.id,
        status: payment.status,
        amount: payment.transaction_amount,
        email: payment.payer?.email,
        created: payment.date_created,
        approved: payment.date_approved,
        method: payment.payment_method_id
      });

      return NextResponse.json({
        success: true,
        payment: {
          id: payment.id,
          status: payment.status,
          amount: payment.transaction_amount,
          email: payment.payer?.email,
          created: payment.date_created,
          approved: payment.date_approved,
          externalReference: payment.external_reference
        },
        isApproved: payment.status === 'approved',
        message: payment.status === 'approved' 
          ? 'Pagamento aprovado com sucesso!' 
          : `Status do pagamento: ${payment.status}`
      });

    } catch (error: any) {
      console.error('❌ [PIX VERIFY] Erro ao verificar pagamento:', error);
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Não foi possível verificar o pagamento',
          details: error.message,
          suggestion: 'O pagamento pode ainda estar sendo processado. Tente novamente em alguns minutos.'
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ [PIX VERIFY] Erro geral:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Endpoint GET para verificar se a API está funcionando
export async function GET() {
  return NextResponse.json({
    message: 'API de verificação de pagamentos PIX está funcionando',
    timestamp: new Date().toISOString(),
    features: [
      'Verificação com retry automático',
      'SDK oficial do Mercado Pago',
      'Tratamento de erros robusto'
    ]
  });
}
