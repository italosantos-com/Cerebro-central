import { NextRequest, NextResponse } from 'next/server';
import { mercadopagoClient } from '@/lib/mercadopago-client';
import { subscriptionManager } from '@/lib/subscription-manager';

interface VerifyCpfRequest {
  cpf: string;
  email: string;
  name: string;
  amount: number;
}

export async function POST(request: NextRequest) {
  try {
    const { cpf, email, name, amount }: VerifyCpfRequest = await request.json();

    console.log('🔍 [PIX VERIFY CPF] Verificando pagamento por CPF:', { cpf, email, amount });

    // Validação básica
    if (!cpf || !email || !name || !amount) {
      return NextResponse.json(
        { error: 'Dados incompletos. CPF, email, nome e valor são obrigatórios.' },
        { status: 400 }
      );
    }

    // Limpar CPF (remover pontos e traços)
    const cleanCpf = cpf.replace(/[^\d]/g, '');
    
    if (cleanCpf.length !== 11) {
      return NextResponse.json(
        { error: 'CPF inválido. Deve conter 11 dígitos.' },
        { status: 400 }
      );
    }

    // Buscar pagamentos recentes do Mercado Pago (últimas 24 horas)
    console.log('🔍 [PIX VERIFY CPF] Buscando pagamentos recentes...');
    
    try {
      const recentPayments = await mercadopagoClient.listRecentPayments(50);
      
      console.log(`📋 [PIX VERIFY CPF] Encontrados ${recentPayments.length} pagamentos recentes`);
      
      // Filtrar pagamentos PIX aprovados com o valor correto
      const matchingPayments = recentPayments.filter((payment: any) => {
        const isPix = payment.payment_method_id === 'pix';
        const isApproved = payment.status === 'approved';
        const correctAmount = payment.transaction_amount ? Math.abs(payment.transaction_amount - amount) <= 0.01 : false;
        const hasPayer = payment.payer && payment.payer.identification;
        
        console.log(`🔍 [PIX VERIFY CPF] Verificando pagamento ${payment.id}:`, {
          isPix,
          isApproved,
          correctAmount,
          hasPayer,
          paymentAmount: payment.transaction_amount,
          requestedAmount: amount,
          payerCpf: payment.payer?.identification?.number
        });
        
        return isPix && isApproved && correctAmount && hasPayer;
      });

      console.log(`✅ [PIX VERIFY CPF] Encontrados ${matchingPayments.length} pagamentos PIX aprovados com valor correto`);

      // Verificar se algum pagamento tem o CPF correspondente
      const paymentWithCpf = matchingPayments.find((payment: any) => {
        const payerCpf = payment.payer?.identification?.number;
        return payerCpf && payerCpf.replace(/[^\d]/g, '') === cleanCpf;
      });

      if (!paymentWithCpf) {
        console.log('❌ [PIX VERIFY CPF] Nenhum pagamento encontrado com o CPF fornecido');
        return NextResponse.json({
          success: false,
          error: 'Nenhum pagamento PIX aprovado encontrado com este CPF e valor.',
          message: 'Verifique se o pagamento foi realizado corretamente e tente novamente.'
        });
      }

      console.log('✅ [PIX VERIFY CPF] Pagamento encontrado:', paymentWithCpf.id);

      // Verificar se já existe uma assinatura para este pagamento
      if (!paymentWithCpf.id) {
        console.error('❌ [PIX VERIFY CPF] ID do pagamento não encontrado');
        return NextResponse.json({
          success: false,
          error: 'ID do pagamento não encontrado'
        }, { status: 400 });
      }
      
      const existingSubscription = await subscriptionManager.getSubscriptionByPaymentId(paymentWithCpf.id.toString());
      
      if (existingSubscription) {
        console.log('⚠️ [PIX VERIFY CPF] Assinatura já existe para este pagamento');
        return NextResponse.json({
          success: false,
          error: 'Este pagamento já foi confirmado anteriormente.',
          message: 'Sua assinatura já está ativa.'
        });
      }

      // Criar assinatura
      console.log('🎯 [PIX VERIFY CPF] Criando assinatura...');
      
      const subscriptionData = {
        userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: paymentWithCpf.payer?.email || email,
        planId: 'monthly',
        paymentId: paymentWithCpf.id.toString(),
        amount: paymentWithCpf.transaction_amount,
        paymentMethod: 'pix' as const
      };

      const subscriptionId = await subscriptionManager.createSubscription(subscriptionData);

      console.log('✅ [PIX VERIFY CPF] Assinatura criada com sucesso:', subscriptionId);

      return NextResponse.json({
        success: true,
        subscriptionId: subscriptionId,
        paymentId: paymentWithCpf.id,
        amount: paymentWithCpf.transaction_amount,
        status: 'approved',
        message: 'Pagamento confirmado! Sua assinatura foi ativada com sucesso.'
      });

    } catch (error) {
      console.error('❌ [PIX VERIFY CPF] Erro ao buscar pagamentos:', error);
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar pagamentos no Mercado Pago.',
        message: 'Tente novamente em alguns minutos.'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ [PIX VERIFY CPF] Erro geral:', error);
    
    let errorMessage = 'Erro interno do servidor. Tente novamente.';
    
    if (error instanceof Error) {
      if (error.message.includes('CPF')) {
        errorMessage = 'CPF inválido. Verifique o número e tente novamente.';
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
    message: 'API para verificar pagamentos PIX por CPF',
    usage: 'POST /api/pix/verify-cpf com { cpf, email, name, amount }'
  });
}
