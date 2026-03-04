import { NextRequest, NextResponse } from 'next/server';
import { mercadopagoClient } from '@/lib/mercadopago-client';
import { subscriptionManager } from '@/lib/subscription-manager';

interface CheckPaymentRequest {
  paymentId: string;
  email: string;
  name: string;
  amount: number;
  maxRetries?: number;
  delayMs?: number;
  mediaUrl?: string;
  conversationId?: string;
}

async function deliverPixMedia(options: {
  conversationId?: string;
  mediaUrl?: string;
  amount: number;
}) {
  if (!options.conversationId || !options.mediaUrl) return;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
  const token = process.env.INTERNAL_SERVICE_TOKEN || '';
  if (!token) return;

  const text = `Pagamento PIX confirmado. Valor: R$ ${options.amount}\nMidia: ${options.mediaUrl}`;

  await fetch(`${baseUrl}/api/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-token': token,
    },
    body: JSON.stringify({
      channel: 'site',
      conversationId: options.conversationId,
      recipientId: options.conversationId,
      text,
    }),
  }).catch(() => undefined);
}

export async function POST(request: NextRequest) {
  try {
    const {
      paymentId,
      email,
      name,
      amount,
      maxRetries = 5,
      delayMs = 3000,
      mediaUrl,
      conversationId
    }: CheckPaymentRequest = await request.json();

    console.log('🔍 [PIX CHECK PAYMENT] Verificando pagamento:', { paymentId, email, amount });

    // Validação básica
    if (!paymentId || !email || !name || !amount) {
      return NextResponse.json(
        { error: 'Dados incompletos. ID do pagamento, email, nome e valor são obrigatórios.' },
        { status: 400 }
      );
    }

    // Verificar se já existe uma assinatura para este pagamento
    const existingSubscription = await subscriptionManager.getSubscriptionByPaymentId(paymentId);

    if (existingSubscription) {
      console.log('⚠️ [PIX CHECK PAYMENT] Assinatura já existe para este pagamento');
      return NextResponse.json({
        success: false,
        error: 'Este pagamento já foi confirmado anteriormente.',
        message: 'Sua assinatura já está ativa.',
        subscriptionId: existingSubscription.id
      });
    }

    // Polling com retry para verificar o status do pagamento
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 [PIX CHECK PAYMENT] Tentativa ${attempt}/${maxRetries} - Verificando pagamento ${paymentId}`);

        // Usar o cliente oficial para verificar o pagamento
        const paymentData = await mercadopagoClient.getPayment(paymentId, 1, 1000);

        console.log('💰 [PIX CHECK PAYMENT] Status do pagamento:', {
          id: paymentData.id,
          status: paymentData.status,
          amount: paymentData.transaction_amount,
          attempt
        });

        // Se o pagamento foi aprovado
        if (paymentData.status === 'approved') {
          console.log('✅ [PIX CHECK PAYMENT] Pagamento aprovado!');

          // Verificar se o valor corresponde
          const realAmount = paymentData.transaction_amount;
          const requestedAmount = parseFloat(amount.toString());

          if (!realAmount) {
            console.log('❌ [PIX CHECK PAYMENT] Valor do pagamento não encontrado');
            return NextResponse.json({
              success: false,
              error: 'Valor do pagamento não encontrado.',
              message: 'Erro ao processar pagamento. Tente novamente.'
            });
          }

          if (Math.abs(realAmount - requestedAmount) > 0.01) {
            console.log('❌ [PIX CHECK PAYMENT] Valor não corresponde:', { realAmount, requestedAmount });
            return NextResponse.json({
              success: false,
              error: 'Valor do pagamento não corresponde ao valor solicitado.',
              message: 'Verifique o valor e tente novamente.'
            });
          }

          // Criar assinatura
          console.log('🎯 [PIX CHECK PAYMENT] Criando assinatura...');

          const subscriptionData = {
            userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email,
            planId: 'monthly',
            paymentId: paymentId.toString(),
            amount: realAmount,
            paymentMethod: 'pix' as const
          };

          const subscriptionId = await subscriptionManager.createSubscription(subscriptionData);

          console.log('✅ [PIX CHECK PAYMENT] Assinatura criada com sucesso:', subscriptionId);

          await deliverPixMedia({ conversationId, mediaUrl, amount: realAmount });

          return NextResponse.json({
            success: true,
            subscriptionId: subscriptionId,
            paymentId: paymentId,
            amount: realAmount,
            status: 'approved',
            message: 'Pagamento confirmado! Sua assinatura foi ativada com sucesso.'
          });

        } else if (paymentData.status === 'rejected' || paymentData.status === 'cancelled') {
          console.log('❌ [PIX CHECK PAYMENT] Pagamento rejeitado/cancelado:', paymentData.status);
          return NextResponse.json({
            success: false,
            error: `Pagamento ${paymentData.status === 'rejected' ? 'rejeitado' : 'cancelado'}.`,
            message: 'O pagamento não foi aprovado. Tente novamente.'
          });

        } else if (paymentData.status === 'pending') {
          console.log('⏳ [PIX CHECK PAYMENT] Pagamento ainda pendente...');

          // Se não é a última tentativa, aguardar
          if (attempt < maxRetries) {
            console.log(`⏳ [PIX CHECK PAYMENT] Aguardando ${delayMs}ms antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          } else {
            return NextResponse.json({
              success: false,
              error: 'Pagamento ainda pendente após todas as tentativas.',
              message: 'O pagamento ainda está sendo processado. Tente novamente em alguns minutos.'
            });
          }
        }

      } catch (error: any) {
        lastError = error;
        console.log(`❌ [PIX CHECK PAYMENT] Tentativa ${attempt} falhou:`, error.message);

        // Se não é a última tentativa, aguardar
        if (attempt < maxRetries) {
          console.log(`⏳ [PIX CHECK PAYMENT] Aguardando ${delayMs}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // Todas as tentativas falharam
    console.error('❌ [PIX CHECK PAYMENT] Todas as tentativas falharam');
    return NextResponse.json({
      success: false,
      error: `Não foi possível verificar o pagamento após ${maxRetries} tentativas.`,
      message: 'Tente novamente em alguns minutos ou entre em contato com o suporte.'
    }, { status: 500 });

  } catch (error) {
    console.error('❌ [PIX CHECK PAYMENT] Erro geral:', error);

    let errorMessage = 'Erro interno do servidor. Tente novamente.';

    if (error instanceof Error) {
      if (error.message.includes('não encontrado') || error.message.includes('not found')) {
        errorMessage = 'Pagamento não encontrado. Verifique o ID do pagamento.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API para verificação automática de pagamentos PIX',
    usage: 'POST /api/pix/check-payment com { paymentId, email, name, amount, maxRetries?, delayMs? }'
  });
}
