import { NextRequest, NextResponse } from 'next/server';
import { mercadopagoClient } from '@/lib/mercadopago-client';
import { subscriptionManager } from '@/lib/subscription-manager';
import { resolveAdminUidByUsernameServer } from '@/lib/admin-username-resolver';

export async function POST(request: NextRequest) {
  try {
    const { email, name, amount, paymentId, publicUsername, adminUid: rawAdminUid } = await request.json();

    const scopedAdminUid: string | null =
      (typeof rawAdminUid === 'string' && rawAdminUid.trim() ? rawAdminUid.trim() : null) ||
      (publicUsername ? await resolveAdminUidByUsernameServer(publicUsername) : null);

    console.log('🔍 [PIX VERIFY OFFICIAL] Verificação oficial:', { email, amount, paymentId });

    if (!email || !name) {
      return NextResponse.json({
        success: false,
        error: 'Email e nome são obrigatórios'
      }, { status: 400 });
    }

    try {
      // MÉTODO 1: Se temos paymentId, verificar diretamente (MAIS CONFIÁVEL)
      if (paymentId) {
        console.log('🔍 [PIX VERIFY OFFICIAL] Verificando pagamento específico:', paymentId);
        
        const payment = await mercadopagoClient.getPayment(paymentId);
        
        console.log('📊 [PIX VERIFY OFFICIAL] Status do pagamento:', {
          id: payment.id,
          status: payment.status,
          amount: payment.transaction_amount,
          method: payment.payment_method_id
        });

        if (payment.status === 'approved') {
          console.log('✅ [PIX VERIFY OFFICIAL] Pagamento aprovado encontrado:', paymentId);
          
          // Verificar se já existe uma assinatura
          const existingSubscription = await subscriptionManager.getSubscriptionByPaymentId(paymentId.toString());
          
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
            userId: email,
            email,
            planId: 'monthly',
            paymentId: paymentId.toString(),
            paymentMethod: 'pix' as const,
            amount: payment.transaction_amount,
            ...(scopedAdminUid ? { adminUid: scopedAdminUid } : {})
          };

          const subscription = await subscriptionManager.createSubscription(subscriptionData);

          return NextResponse.json({
            success: true,
            subscriptionId: subscription,
            paymentId: paymentId,
            amount: payment.transaction_amount,
            message: 'Pagamento confirmado oficialmente! Sua assinatura foi ativada.',
            status: 'approved'
          });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Pagamento encontrado, mas não foi aprovado ainda.',
            message: 'Aguarde alguns minutos para o processamento.',
            status: payment.status,
            method: 'payment_id_direct'
          });
        }
      }

      // MÉTODO 2: Buscar por email nos pagamentos recentes (FALLBACK)
      console.log('🔍 [PIX VERIFY OFFICIAL] Buscando pagamentos por email:', email);
      
      const recentPayments = await mercadopagoClient.listAllRecentPayments(20);
      
      console.log(`📋 [PIX VERIFY OFFICIAL] Encontrados ${recentPayments.length} pagamentos`);
      
      // Filtrar pagamentos PIX com o email correto
      const matchingPayments = recentPayments.filter((payment: any) => {
        const isPix = payment.payment_method_id === 'pix';
        const correctEmail = payment.payer?.email === email;
        const correctAmount = amount && payment.transaction_amount ? Math.abs(payment.transaction_amount - amount) <= 0.01 : true;
        
        return isPix && correctEmail && correctAmount;
      });

      console.log(`✅ [PIX VERIFY OFFICIAL] Encontrados ${matchingPayments.length} pagamentos PIX com email correto`);

      if (matchingPayments.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Nenhum pagamento PIX encontrado com este email.',
          message: 'Verifique se o pagamento foi realizado corretamente.',
          suggestions: [
            'Verifique se o email usado no pagamento é exatamente: ' + email,
            'Aguarde alguns minutos após o pagamento',
            'Verifique se o pagamento foi realmente aprovado no seu banco'
          ],
          method: 'email_search'
        });
      }

      // Mostrar todos os pagamentos encontrados
      const paymentDetails = matchingPayments.map((payment: any) => ({
        id: payment.id,
        status: payment.status,
        amount: payment.transaction_amount,
        date_created: payment.date_created,
        date_approved: payment.date_approved
      }));

      // Verificar se há algum pagamento aprovado
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
          ],
          method: 'email_search'
        });
      }

      // Pegar o pagamento mais recente
      const latestApprovedPayment = matchingPayments.sort((a: any, b: any) => {
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
        paymentMethod: 'pix' as const,
        ...(scopedAdminUid ? { adminUid: scopedAdminUid } : {})
      };

      const subscriptionId = await subscriptionManager.createSubscription(subscriptionData);

      return NextResponse.json({
        success: true,
        subscriptionId: subscriptionId,
        paymentId: latestApprovedPayment.id,
        amount: latestApprovedPayment.transaction_amount || 0,
        status: 'approved',
        message: 'Pagamento confirmado oficialmente! Sua assinatura foi ativada.'
      });

    } catch (error) {
      console.error('❌ [PIX VERIFY OFFICIAL] Erro ao buscar pagamentos:', error);
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar pagamentos no Mercado Pago.',
        message: 'Tente novamente em alguns minutos.'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ [PIX VERIFY OFFICIAL] Erro geral:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor. Tente novamente.'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API para verificar pagamentos PIX usando APENAS métodos oficiais do Mercado Pago',
    usage: 'POST /api/pix/verify-official com { email, name, amount?, paymentId? }',
    features: [
      'Usa SDK oficial do Mercado Pago',
      'Verificação direta por paymentId (mais confiável)',
      'Busca por email como fallback',
      'Validações oficiais do Mercado Pago',
      'Criação automática de assinatura'
    ]
  });
}
