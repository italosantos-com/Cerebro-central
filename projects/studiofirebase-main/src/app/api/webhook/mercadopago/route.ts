import { NextRequest, NextResponse } from 'next/server';
import { subscriptionManager } from '@/lib/subscription-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔔 [MERCADO PAGO WEBHOOK] Notificação recebida:', body);

    // Verificar se é uma notificação de pagamento
    if (body.type !== 'payment') {
      return NextResponse.json({ message: 'Notificação ignorada - não é um pagamento' });
    }

    const paymentId = body.data.id;
    
    // Buscar detalhes do pagamento no Mercado Pago
    const mercadopagoResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!mercadopagoResponse.ok) {
      console.error('❌ [MERCADO PAGO WEBHOOK] Erro ao buscar pagamento:', paymentId);
      return NextResponse.json({ error: 'Erro ao buscar pagamento' }, { status: 400 });
    }

    const paymentData = await mercadopagoResponse.json();
    console.log('💰 [MERCADO PAGO WEBHOOK] Dados do pagamento:', {
      id: paymentData.id,
      status: paymentData.status,
      amount: paymentData.transaction_amount,
      email: paymentData.payer?.email
    });

    // Processar apenas pagamentos aprovados
    if (paymentData.status === 'approved') {
      const email = paymentData.payer?.email;
      const amount = paymentData.transaction_amount;
      const externalReference = paymentData.external_reference;

      if (!email) {
        console.error('❌ [MERCADO PAGO WEBHOOK] Email não encontrado no pagamento');
        return NextResponse.json({ error: 'Email não encontrado' }, { status: 400 });
      }

      try {
        // Verificar se já existe uma assinatura para este pagamento
        const existingSubscription = await subscriptionManager.getSubscriptionByPaymentId(paymentId.toString());
        
        if (existingSubscription) {
          console.log('✅ [MERCADO PAGO WEBHOOK] Assinatura já existe para este pagamento:', paymentId);
          return NextResponse.json({ message: 'Assinatura já existe' });
        }

        // Criar nova assinatura
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const subscriptionId = await subscriptionManager.createSubscription({
          userId,
          email,
          planId: 'monthly',
          paymentId: paymentId.toString(),
          paymentMethod: 'pix',
          amount
        });

        console.log('✅ [MERCADO PAGO WEBHOOK] Assinatura criada automaticamente:', subscriptionId);

        return NextResponse.json({
          success: true,
          subscriptionId,
          message: 'Assinatura criada com sucesso via webhook'
        });

      } catch (error) {
        console.error('❌ [MERCADO PAGO WEBHOOK] Erro ao criar assinatura:', error);
        return NextResponse.json({ error: 'Erro ao criar assinatura' }, { status: 500 });
      }
    } else {
      console.log('⏳ [MERCADO PAGO WEBHOOK] Pagamento não aprovado:', paymentData.status);
      return NextResponse.json({ message: 'Pagamento não aprovado' });
    }

  } catch (error) {
    console.error('❌ [MERCADO PAGO WEBHOOK] Erro ao processar webhook:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Endpoint para verificar se o webhook está funcionando
  return NextResponse.json({ 
    message: 'Webhook do Mercado Pago está funcionando',
    timestamp: new Date().toISOString()
  });
}
