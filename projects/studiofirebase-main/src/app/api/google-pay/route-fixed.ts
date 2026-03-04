import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Iniciando processamento Google Pay...');
    
    const body = await request.json();
    const { paymentToken, paymentData, userEmail } = body;

    console.log('📋 Dados recebidos:');
    console.log('- Email:', userEmail);
    console.log('- Token presente:', !!paymentToken);
    console.log('- PaymentData presente:', !!paymentData);
    
    // Log mais detalhado para debug
    if (paymentData) {
      console.log('- PaymentData keys:', Object.keys(paymentData));
      if (paymentData.paymentMethodData) {
        console.log('- PaymentMethodData keys:', Object.keys(paymentData.paymentMethodData));
      }
    }

    // Validar dados obrigatórios
    if (!paymentToken) {
      return NextResponse.json({
        success: false,
        error: 'Token de pagamento não fornecido'
      }, { status: 400 });
    }

    if (!userEmail) {
      return NextResponse.json({
        success: false,
        error: 'Email do usuário é obrigatório'
      }, { status: 400 });
    }

    // Simular validação do token Google Pay
    const isValidToken = validateGooglePayToken(paymentToken);
    
    if (!isValidToken) {
      return NextResponse.json({
        success: false,
        error: 'Token de pagamento inválido'
      }, { status: 400 });
    }

    // Simular processamento do pagamento
    const paymentResult = await processGooglePayPayment(paymentToken, paymentData, userEmail);

    if (paymentResult.success) {
      console.log('✅ Pagamento processado com sucesso');
      
      return NextResponse.json({
        success: true,
        transactionId: paymentResult.transactionId,
        subscriptionId: paymentResult.subscriptionId,
        message: 'Pagamento processado com sucesso',
        subscription: {
          status: 'active',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
          amount: 99.00,
          currency: 'BRL'
        }
      });
    } else {
      console.log('❌ Falha no processamento do pagamento');
      
      return NextResponse.json({
        success: false,
        error: paymentResult.error || 'Erro interno no processamento'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Erro no endpoint Google Pay:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// Função para validar token Google Pay
function validateGooglePayToken(token: string): boolean {
  try {
    // Em produção, você deve validar o token com Google Pay API
    // ou com seu gateway de pagamento (Stripe, PayPal, etc.)
    
    // Para teste, vamos apenas verificar se o token existe e tem formato básico
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Verificar se parece com um token válido (base64, JSON, etc.)
    if (token.length < 10) {
      return false;
    }

    console.log('✅ Token Google Pay validado');
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao validar token:', error);
    return false;
  }
}

// Função para processar o pagamento
async function processGooglePayPayment(
  token: string, 
  paymentData: any, 
  userEmail: string
): Promise<{ success: boolean; transactionId?: string; subscriptionId?: string; error?: string }> {
  
  try {
    console.log('💳 Iniciando processamento do pagamento...');
    
    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Em produção, aqui você faria:
    // 1. Enviar o token para seu gateway de pagamento (Stripe, etc.)
    // 2. Processar o pagamento
    // 3. Criar/atualizar a assinatura no Firebase
    // 4. Enviar confirmação por email
    
    // Para teste, vamos simular sucesso
    const transactionId = `gp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simular 90% de sucesso, 10% de falha para testes
    const shouldSucceed = Math.random() > 0.1;
    
    if (shouldSucceed) {
      console.log('✅ Pagamento aprovado pelo gateway');
      console.log('📝 ID da transação:', transactionId);
      console.log('🎯 ID da assinatura:', subscriptionId);
      
      return {
        success: true,
        transactionId,
        subscriptionId
      };
    } else {
      console.log('❌ Pagamento rejeitado pelo gateway');
      
      return {
        success: false,
        error: 'Pagamento rejeitado pelo banco - tente outro cartão'
      };
    }
    
  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    
    return {
      success: false,
      error: 'Erro interno no processamento do pagamento'
    };
  }
}

// Método GET para verificar se a API está funcionando
export async function GET() {
  return NextResponse.json({
    message: 'API Google Pay funcionando',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    localhost: true
  });
}
