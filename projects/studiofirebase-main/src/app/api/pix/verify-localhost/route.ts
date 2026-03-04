import { NextRequest, NextResponse } from 'next/server';
import { mercadopagoClient } from '@/lib/mercadopago-client';
import { subscriptionManager } from '@/lib/subscription-manager';

export async function POST(request: NextRequest) {
  try {
    const { email, name, amount, paymentId } = await request.json();

    console.log('🔍 [PIX VERIFY LOCALHOST] Verificando pagamento no localhost:', { email, amount, paymentId });

    if (!email || !name) {
      return NextResponse.json({
        success: false,
        error: 'Email e nome são obrigatórios'
      }, { status: 400 });
    }

    try {
      // 1. Se temos o paymentId, verificar diretamente
      if (paymentId) {
        console.log('🔍 [PIX VERIFY LOCALHOST] Verificando pagamento específico:', paymentId);
        
        const payment = await mercadopagoClient.getPayment(paymentId);
        
        if (payment.status === 'approved') {
          console.log('✅ [PIX VERIFY LOCALHOST] Pagamento aprovado encontrado:', paymentId);
          
          // Verificar se já existe uma assinatura
          const existingSubscription = await subscriptionManager.getSubscriptionByPaymentId(paymentId);
          
          if (existingSubscription) {
            return NextResponse.json({
              success: false,
              error: 'Este pagamento já foi confirmado anteriormente.',
              message: 'Sua assinatura já está ativa.',
              subscriptionId: existingSubscription.id
            });
          }

          // Criar assinatura
          const subscriptionData = {
            userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: payment.payer?.email || email,
            planId: 'monthly',
            paymentId: payment.id?.toString() || `local_${Date.now()}`,
            amount: payment.transaction_amount,
            paymentMethod: 'pix' as const
          };

          const subscriptionId = await subscriptionManager.createSubscription(subscriptionData);

          return NextResponse.json({
            success: true,
            subscriptionId: subscriptionId,
            paymentId: payment.id || `local_${Date.now()}`,
            amount: payment.transaction_amount || 0,
            status: 'approved',
            message: 'Pagamento confirmado! Sua assinatura foi ativada com sucesso.'
          });

        } else {
          console.log('❌ [PIX VERIFY LOCALHOST] Pagamento não aprovado:', payment.status);
          return NextResponse.json({
            success: false,
            error: 'Pagamento não foi aprovado.',
            message: 'O pagamento ainda está sendo processado. Tente novamente.'
          });
        }

      } else {
        // Se não tem paymentId, buscar pagamentos recentes
        console.log('🔍 [PIX VERIFY LOCALHOST] Buscando pagamentos recentes...');
        
        const recentPayments = await mercadopagoClient.listRecentPayments(20);
        
        // Filtrar pagamentos PIX aprovados com o valor correto
        const approvedPayments = recentPayments.filter((payment: any) => {
          const isPix = payment.payment_method_id === 'pix';
          const isApproved = payment.status === 'approved';
          const correctAmount = payment.transaction_amount ? Math.abs(payment.transaction_amount - amount) <= 0.01 : false;
          
          return isPix && isApproved && correctAmount;
        });

        if (approvedPayments.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'Nenhum pagamento PIX aprovado encontrado.',
            message: 'Verifique se o pagamento foi realizado corretamente.'
          });
        }

        // Pegar o pagamento mais recente
        const latestApprovedPayment = approvedPayments.sort((a: any, b: any) => {
          const dateA = a.date_created ? new Date(a.date_created).getTime() : 0;
          const dateB = b.date_created ? new Date(b.date_created).getTime() : 0;
          return dateB - dateA;
        })[0];

        if (!latestApprovedPayment.id) {
          return NextResponse.json({
            success: false,
            error: 'ID do pagamento não encontrado.'
          }, { status: 400 });
        }

        // Verificar se já existe uma assinatura
        const existingSubscription = await subscriptionManager.getSubscriptionByPaymentId(latestApprovedPayment.id.toString());
        
        if (existingSubscription) {
          return NextResponse.json({
            success: true,
            subscriptionId: existingSubscription.id,
            paymentId: latestApprovedPayment.id,
            amount: latestApprovedPayment.transaction_amount || 0,
            status: 'already_exists',
            message: 'Assinatura já existe para este pagamento.'
          });
        }

        // Criar assinatura
        const subscriptionData = {
          userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email: latestApprovedPayment.payer?.email || email,
          planId: 'monthly',
          paymentId: latestApprovedPayment.id.toString(),
          amount: latestApprovedPayment.transaction_amount,
          paymentMethod: 'pix' as const
        };

        const subscriptionId = await subscriptionManager.createSubscription(subscriptionData);

        return NextResponse.json({
          success: true,
          subscriptionId: subscriptionId,
          paymentId: latestApprovedPayment.id,
          amount: latestApprovedPayment.transaction_amount || 0,
          status: 'approved',
          message: 'Pagamento confirmado! Sua assinatura foi ativada com sucesso.'
        });
      }
    } catch (error) {
      console.error('❌ [PIX VERIFY LOCALHOST] Erro ao verificar pagamento:', error);
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar pagamento.',
        message: 'Tente novamente em alguns minutos.'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ [PIX VERIFY LOCALHOST] Erro geral:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor. Tente novamente.'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API para verificar pagamentos PIX no localhost',
    usage: 'POST /api/pix/verify-localhost com { email, name, amount?, paymentId? }'
  });
}
