import { NextRequest, NextResponse } from 'next/server';
import { subscriptionManager } from '@/lib/subscription-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('🔔 [GOOGLE PAY] Processando pagamento:', {
      amount: body.amount,
      currency: body.currency,
      userEmail: body.userEmail,
      merchantId: body.merchantId,
      tokenType: body.paymentData?.paymentMethodData?.tokenizationData?.type || 'unknown',
      environment: process.env.NODE_ENV,
      isLocalhost: process.env.NODE_ENV === 'development'
    });

    // Validações básicas
    if (!body.amount || !body.currency || !body.userEmail) {
      return NextResponse.json({
        success: false,
        error: 'Dados incompletos. Valor, moeda e email são obrigatórios.'
      }, { status: 400 });
    }

    // Validar se o usuário está autenticado
    if (!body.userEmail || body.userEmail.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Usuário não autenticado.'
      }, { status: 401 });
    }

    // Processar token/nonce do Google Pay via Braintree
    const paymentMethodNonce = body.paymentMethodNonce || body.paymentData?.paymentMethodData?.tokenizationData?.token;

    if (!paymentMethodNonce) {
      return NextResponse.json({
        success: false,
        error: 'Payment method nonce não recebido do Google Pay'
      }, { status: 400 });
    }

    console.log('🔐 [GOOGLE PAY] Nonce recebido (primeiros 20 chars):', paymentMethodNonce.substring(0, 20));

    // Import Braintree gateway
    const { getBraintreeGateway } = await import('@/lib/braintree-gateway');
    const gateway = getBraintreeGateway();

    // Validar valor do pagamento (deve ser pelo menos 99.00 para assinatura)
    const paymentAmount = parseFloat(body.amount);
    if (paymentAmount < 99.00) {
      console.warn('⚠️ [GOOGLE PAY] Valor insuficiente para assinatura:', paymentAmount);
      return NextResponse.json({
        success: false,
        error: 'Valor insuficiente para ativar a assinatura. Valor mínimo: R$ 99,00'
      }, { status: 400 });
    }

    // Verificar se já existe uma assinatura para este usuário
    try {
      const hasActive = await subscriptionManager.hasActiveSubscription(body.userEmail);

      if (hasActive) {
        console.log('⚠️ [GOOGLE PAY] Usuário já possui assinatura ativa válida');
        return NextResponse.json({
          success: false,
          error: 'Você já possui uma assinatura ativa.',
          message: 'Sua assinatura já está ativa e funcionando.',
          status: 'already_active'
        }, { status: 409 });
      }
    } catch (error) {
      console.warn('⚠️ [GOOGLE PAY] Erro ao verificar assinaturas existentes:', error);
      // Continuar com a criação da nova assinatura
    }

    // Processar transação com Braintree
    console.log('💳 [GOOGLE PAY] Processando transação com Braintree...');
    
    const braintreeResult = await gateway.transaction.sale({
      amount: paymentAmount.toFixed(2),
      paymentMethodNonce: paymentMethodNonce,
      options: {
        submitForSettlement: true,
      },
      customer: {
        email: body.userEmail,
      },
    });

    if (!braintreeResult.success) {
      console.error('❌ [GOOGLE PAY] Braintree rejeitou a transação:', braintreeResult.message);
      return NextResponse.json({
        success: false,
        error: 'Pagamento rejeitado pelo processador',
        message: braintreeResult.message || 'Transação negada',
      }, { status: 400 });
    }

    const transaction = braintreeResult.transaction;
    console.log('✅ [GOOGLE PAY] Transação aprovada no Braintree:', transaction.id);

    // Criar assinatura com ID da transação Braintree
    const subscriptionData = {
      userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: body.userEmail,
      planId: 'monthly',
      paymentId: transaction.id, // ID da transação Braintree
      amount: paymentAmount,
      paymentMethod: 'google_pay' as const,
    };

    console.log('🎯 [GOOGLE PAY] Criando assinatura com dados:', subscriptionData);

    // Log adicional para debug
    console.log('🔍 [GOOGLE PAY] Verificando Firebase Admin...');
    console.log('🔍 [GOOGLE PAY] NODE_ENV:', process.env.NODE_ENV);
    console.log('🔍 [GOOGLE PAY] Processando assinatura...');

    const subscriptionId = await subscriptionManager.createSubscription(subscriptionData);

    console.log('✅ [GOOGLE PAY] Assinatura criada com sucesso:', subscriptionId);

    // Retornar resposta de sucesso
    return NextResponse.json({
      success: true,
      message: 'Pagamento Google Pay processado com sucesso via Braintree! Sua assinatura foi ativada.',
      transactionId: transaction.id,
      braintreeTransactionId: transaction.id,
      subscriptionId: subscriptionId,
      amount: paymentAmount,
      status: 'approved',
      planId: 'monthly',
      paymentMethod: 'google_pay',
      processor: 'braintree'
    });

  } catch (error) {
    console.error('❌ [GOOGLE PAY] Erro ao processar pagamento:', error);

    let errorMessage = 'Erro ao processar pagamento Google Pay';

    if (error instanceof Error) {
      if (error.message.includes('subscription')) {
        errorMessage = 'Erro ao criar assinatura. Tente novamente.';
      } else if (error.message.includes('database')) {
        errorMessage = 'Erro de conexão com o banco de dados. Tente novamente.';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API Google Pay está funcionando',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    googlePayConfig: {
      merchantId: process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID || 'Não configurado',
      environment: process.env.NEXT_PUBLIC_GOOGLE_PAY_ENVIRONMENT || 'Não configurado',
      merchantName: process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_NAME || 'Não configurado'
    }
  });
}
