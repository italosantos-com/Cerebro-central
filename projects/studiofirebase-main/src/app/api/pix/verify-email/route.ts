import { NextRequest, NextResponse } from 'next/server';
import { mercadopagoClient } from '@/lib/mercadopago-client';
import { subscriptionManager } from '@/lib/subscription-manager';

interface VerifyEmailRequest {
  email: string;
  name: string;
  amount: number;
  cpf?: string; // Opcional, para registro
}

export async function POST(request: NextRequest) {
  try {
    const { email, name, amount, cpf }: VerifyEmailRequest = await request.json();

    console.log('🔍 [PIX VERIFY EMAIL] Verificando pagamento por email:', { email, amount });

    // Validação básica
    if (!email || !name || !amount) {
      return NextResponse.json(
        { error: 'Dados incompletos. Email, nome e valor são obrigatórios.' },
        { status: 400 }
      );
    }

    // Validar valor
    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Valor deve ser maior que zero.' },
        { status: 400 }
      );
    }

    try {
      // Buscar pagamentos recentes do Mercado Pago (últimas 24 horas)
      console.log('🔍 [PIX VERIFY EMAIL] Buscando pagamentos recentes...');
      
      const recentPayments = await mercadopagoClient.listAllRecentPayments(50);
      
      console.log(`📋 [PIX VERIFY EMAIL] Encontrados ${recentPayments.length} pagamentos recentes`);
      
      // Filtrar pagamentos PIX aprovados com o valor correto e email
      const matchingPayments = recentPayments.filter((payment: any) => {
        const isPix = payment.payment_method_id === 'pix';
        const isApproved = payment.status === 'approved';
        const correctAmount = payment.transaction_amount ? Math.abs(payment.transaction_amount - amount) <= 0.01 : false;
        const correctEmail = payment.payer?.email === email;
        
        console.log(`🔍 [PIX VERIFY EMAIL] Verificando pagamento ${payment.id}:`, {
          isPix,
          isApproved,
          correctAmount,
          correctEmail,
          paymentAmount: payment.transaction_amount,
          requestedAmount: amount,
          paymentEmail: payment.payer?.email,
          requestedEmail: email
        });
        
        return isPix && isApproved && correctAmount && correctEmail;
      });

      console.log(`✅ [PIX VERIFY EMAIL] Encontrados ${matchingPayments.length} pagamentos PIX aprovados com email e valor corretos`);

      if (matchingPayments.length === 0) {
        console.log('❌ [PIX VERIFY EMAIL] Nenhum pagamento encontrado com email e valor fornecidos');
        return NextResponse.json({
          success: false,
          error: 'Nenhum pagamento PIX aprovado encontrado com este email e valor.',
          message: 'Verifique se o pagamento foi realizado corretamente e tente novamente.'
        });
      }

      // Pegar o pagamento mais recente
      const latestPayment = matchingPayments.sort((a: any, b: any) => {
        const dateA = a.date_created ? new Date(a.date_created).getTime() : 0;
        const dateB = b.date_created ? new Date(b.date_created).getTime() : 0;
        return dateB - dateA;
      })[0];

      console.log('✅ [PIX VERIFY EMAIL] Pagamento mais recente encontrado:', latestPayment.id);

      // Verificar se já existe uma assinatura para este pagamento
      if (!latestPayment.id) {
        console.error('❌ [PIX VERIFY EMAIL] ID do pagamento não encontrado');
        return NextResponse.json({
          success: false,
          error: 'ID do pagamento não encontrado'
        }, { status: 400 });
      }
      
      const existingSubscription = await subscriptionManager.getSubscriptionByPaymentId(latestPayment.id.toString());

      if (existingSubscription) {
        console.log('⚠️ [PIX VERIFY EMAIL] Assinatura já existe para este pagamento');
        return NextResponse.json({
          success: true,
          subscriptionId: existingSubscription.id,
          paymentId: latestPayment.id,
          amount: latestPayment.transaction_amount,
          status: 'already_exists',
          message: 'Assinatura já existe para este pagamento.'
        });
      }

      // Criar assinatura
      console.log('🎯 [PIX VERIFY EMAIL] Criando assinatura...');
      
      const subscriptionData = {
        userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: latestPayment.payer?.email || email,
        planId: 'monthly',
        paymentId: latestPayment.id.toString(),
        amount: latestPayment.transaction_amount,
        paymentMethod: 'pix' as const
      };

      const subscriptionId = await subscriptionManager.createSubscription(subscriptionData);

      console.log('✅ [PIX VERIFY EMAIL] Assinatura criada com sucesso:', subscriptionId);

      return NextResponse.json({
        success: true,
        subscriptionId: subscriptionId,
        paymentId: latestPayment.id,
        amount: latestPayment.transaction_amount,
        status: 'approved',
        message: 'Pagamento confirmado! Sua assinatura foi ativada com sucesso.'
      });

    } catch (error) {
      console.error('❌ [PIX VERIFY EMAIL] Erro ao buscar pagamentos:', error);
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar pagamentos no Mercado Pago.',
        message: 'Tente novamente em alguns minutos.'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ [PIX VERIFY EMAIL] Erro geral:', error);
    
    let errorMessage = 'Erro interno do servidor. Tente novamente.';
    
    if (error instanceof Error) {
      if (error.message.includes('email')) {
        errorMessage = 'Email inválido. Verifique o endereço e tente novamente.';
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
    message: 'API para verificar pagamentos PIX por email',
    usage: 'POST /api/pix/verify-email com { email, name, amount, cpf? }'
  });
}
