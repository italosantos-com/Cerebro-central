import { NextRequest, NextResponse } from 'next/server';
import { mercadopagoClient } from '@/lib/mercadopago-client';
import { subscriptionManager } from '@/lib/subscription-manager';

export async function POST(request: NextRequest) {
  try {
    const { email, name, amount } = await request.json();

    console.log('🔍 [PIX VERIFY SIMPLE] Verificando pagamento simples:', { email, amount });

    if (!email || !name) {
      return NextResponse.json({
        success: false,
        error: 'Email e nome são obrigatórios'
      }, { status: 400 });
    }

    try {
      // 1. Buscar TODOS os pagamentos PIX recentes (últimos 50)
      console.log('🔍 [PIX VERIFY SIMPLE] Buscando pagamentos recentes...');
      
      const recentPayments = await mercadopagoClient.listAllRecentPayments(50);
      
      console.log(`📋 [PIX VERIFY SIMPLE] Encontrados ${recentPayments.length} pagamentos`);
      
      // 2. Filtrar pagamentos PIX com o email correto
      const matchingPayments = recentPayments.filter((payment: any) => {
        const isPix = payment.payment_method_id === 'pix';
        const correctEmail = payment.payer?.email === email;
        const correctAmount = amount && payment.transaction_amount ? Math.abs(payment.transaction_amount - amount) <= 0.01 : true;
        
        console.log(`🔍 [PIX VERIFY SIMPLE] Verificando pagamento ${payment.id}:`, {
          isPix,
          correctEmail,
          correctAmount,
          status: payment.status,
          paymentAmount: payment.transaction_amount,
          requestedAmount: amount,
          paymentEmail: payment.payer?.email,
          requestedEmail: email
        });
        
        return isPix && correctEmail && correctAmount;
      });

      console.log(`✅ [PIX VERIFY SIMPLE] Encontrados ${matchingPayments.length} pagamentos PIX com email correto`);

      if (matchingPayments.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Nenhum pagamento PIX encontrado com este email.',
          message: 'Verifique se o pagamento foi realizado corretamente.',
          suggestions: [
            'Verifique se o email usado no pagamento é exatamente: ' + email,
            'Aguarde alguns minutos após o pagamento',
            'Verifique se o pagamento foi realmente aprovado no seu banco'
          ]
        });
      }

      // 3. Mostrar todos os pagamentos encontrados
      const paymentDetails = matchingPayments.map((payment: any) => ({
        id: payment.id,
        status: payment.status,
        amount: payment.transaction_amount,
        date_created: payment.date_created,
        date_approved: payment.date_approved
      }));

      console.log('📊 [PIX VERIFY SIMPLE] Pagamentos encontrados:', paymentDetails);

      // 4. Verificar se há algum pagamento aprovado
      const approvedPayments = matchingPayments.filter((payment: any) => payment.status === 'approved');
      
      if (approvedPayments.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Pagamentos encontrados, mas nenhum foi aprovado ainda.',
          message: 'Seus pagamentos estão sendo processados. Aguarde alguns minutos.',
          payments: paymentDetails,
          suggestions: [
            'Aguarde alguns minutos para o processamento',
            'Verifique se o pagamento foi aprovado no seu banco',
            'Tente novamente em 2-3 minutos'
          ]
        });
      }

      // 5. Pegar o pagamento aprovado mais recente
      const latestApprovedPayment = approvedPayments.sort((a: any, b: any) => {
        const dateA = a.date_created ? new Date(a.date_created).getTime() : 0;
        const dateB = b.date_created ? new Date(b.date_created).getTime() : 0;
        return dateB - dateA;
      })[0];

      console.log('✅ [PIX VERIFY SIMPLE] Pagamento aprovado encontrado:', latestApprovedPayment.id);

      // 6. Verificar se já existe uma assinatura para este pagamento
      if (!latestApprovedPayment.id) {
        return NextResponse.json({
          success: false,
          error: 'ID do pagamento não encontrado.'
        }, { status: 400 });
      }
      
      const existingSubscription = await subscriptionManager.getSubscriptionByPaymentId(latestApprovedPayment.id.toString());
      
      if (existingSubscription) {
        console.log('⚠️ [PIX VERIFY SIMPLE] Assinatura já existe para este pagamento');
        return NextResponse.json({
          success: true,
          subscriptionId: existingSubscription.id,
          paymentId: latestApprovedPayment.id,
          amount: latestApprovedPayment.transaction_amount || 0,
          status: 'already_exists',
          message: 'Assinatura já existe para este pagamento.'
        });
      }

      // 7. Criar assinatura
      console.log('🎯 [PIX VERIFY SIMPLE] Criando assinatura...');
      
      const subscriptionData = {
        userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: latestApprovedPayment.payer?.email || email,
        planId: 'monthly',
        paymentId: latestApprovedPayment.id.toString(),
        amount: latestApprovedPayment.transaction_amount,
        paymentMethod: 'pix' as const
      };

      const subscriptionId = await subscriptionManager.createSubscription(subscriptionData);

      console.log('✅ [PIX VERIFY SIMPLE] Assinatura criada com sucesso:', subscriptionId);

      return NextResponse.json({
        success: true,
        subscriptionId: subscriptionId,
        paymentId: latestApprovedPayment.id,
        amount: latestApprovedPayment.transaction_amount || 0,
        status: 'approved',
        message: 'Pagamento confirmado! Sua assinatura foi ativada com sucesso.'
      });

    } catch (error) {
      console.error('❌ [PIX VERIFY SIMPLE] Erro ao buscar pagamentos:', error);
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar pagamentos no Mercado Pago.',
        message: 'Tente novamente em alguns minutos.'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ [PIX VERIFY SIMPLE] Erro geral:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor. Tente novamente.'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API simples para verificar pagamentos PIX',
    usage: 'POST /api/pix/verify-simple com { email, name, amount? }'
  });
}
