import { NextRequest, NextResponse } from 'next/server';
import { getBraintreeGateway } from '@/lib/braintree-gateway';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';

/**
 * POST /api/braintree/checkout
 * Processa pagamento com Braintree (Google Pay, Apple Pay, Card)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token de autenticação não fornecido' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let userId: string;
    let userEmail: string;

    try {
      const auth = getAdminAuth();
      if (!auth) {
        throw new Error('Firebase Auth não inicializado');
      }
      
      const decodedToken = await auth.verifyIdToken(token);
      userId = decodedToken.uid;
      userEmail = decodedToken.email || '';
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Obter dados do body
    const body = await request.json();
    const { 
      paymentMethodNonce, 
      amount, 
      deviceData,
      billingAddress,
      shippingAddress,
      productId,
      productType = 'subscription', // 'subscription' ou 'product'
    } = body;

    if (!paymentMethodNonce) {
      return NextResponse.json(
        { success: false, message: 'Payment method nonce é obrigatório' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Valor inválido' },
        { status: 400 }
      );
    }

    // Obter gateway Braintree
    const gateway = getBraintreeGateway();

    // Criar transação
    const transactionRequest: any = {
      amount: amount.toString(),
      paymentMethodNonce,
      deviceData,
      options: {
        submitForSettlement: true, // Capturar pagamento imediatamente
      },
      customer: {
        email: userEmail,
      },
    };

    // Adicionar endereço de cobrança se fornecido
    if (billingAddress) {
      transactionRequest.billing = billingAddress;
    }

    // Adicionar endereço de entrega se fornecido
    if (shippingAddress) {
      transactionRequest.shipping = shippingAddress;
    }

    // Processar transação
    const result = await gateway.transaction.sale(transactionRequest);

    if (result.success) {
      const transaction = result.transaction;

      // Salvar transação no Firestore
      const adminDb = getAdminDb();
      if (adminDb) {
        await adminDb.collection('transactions').add({
          userId,
          userEmail,
          transactionId: transaction.id,
          amount: parseFloat(amount),
          status: transaction.status,
          paymentMethod: transaction.paymentInstrumentType,
          productId,
          productType,
          createdAt: new Date(),
          braintreeData: {
            processorResponseCode: transaction.processorResponseCode,
            processorResponseText: transaction.processorResponseText,
            merchantAccountId: transaction.merchantAccountId,
          },
        });

        // Se for assinatura, atualizar status do usuário
        if (productType === 'subscription') {
          await adminDb.collection('users').doc(userId).set({
            isSubscriber: true,
            subscriptionStatus: 'active',
            subscriptionStartDate: new Date(),
            lastPaymentDate: new Date(),
            lastTransactionId: transaction.id,
          }, { merge: true });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Pagamento processado com sucesso!',
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          status: transaction.status,
          type: transaction.paymentInstrumentType,
          createdAt: transaction.createdAt,
        },
      });

    } else {
      console.error('Braintree transaction failed:', result.message);

      return NextResponse.json({
        success: false,
        message: result.message || 'Falha ao processar pagamento',
        errors: result.errors,
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Erro ao processar pagamento Braintree:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'Erro ao processar pagamento',
      },
      { status: 500 }
    );
  }
}
