import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { fetchPaypalAccessToken, resolvePaypalApiConfig } from '@/lib/paypal-server';

export async function POST(request: NextRequest) {
  try {
    const { orderId, buyerEmail } = await request.json();

    if (!orderId || !buyerEmail) {
      return NextResponse.json({
        success: false,
        error: 'OrderId e buyerEmail são obrigatórios'
      }, { status: 400 });
    }

    const paypalConfig = resolvePaypalApiConfig();
    const accessToken = await fetchPaypalAccessToken(paypalConfig);

    // Capturar pagamento
    const response = await fetch(`${paypalConfig.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const captureData = await response.json();

    if (response.ok && captureData.status === 'COMPLETED') {
      // Extrair dados do pagamento
      const payment = captureData.purchase_units[0].payments.captures[0];
      const paymentId = payment.id;
      const amount = parseFloat(payment.amount.value);
      const currency = payment.amount.currency_code;

      console.log('PayPal Payment capturado:', {
        orderId,
        paymentId,
        amount,
        currency,
        buyerEmail
      });

      // ✅ SIMPLIFICADO: Atualizar Firestore diretamente
      try {
        const now = new Date();
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 1); // 30 dias

        // Buscar usuário por email no Firestore
        const db = getAdminDb();
        if (!db) {
          throw new Error('Firestore Admin não configurado');
        }
        const usersRef = db.collection('users');
        const userQuery = await usersRef.where('email', '==', buyerEmail).get();

        if (!userQuery.empty) {
          // Usuário existe - atualizar
          const userDoc = userQuery.docs[0];
          await userDoc.ref.update({
            isSubscriber: true,
            subscriptionStartDate: now.toISOString(),
            subscriptionEndDate: expirationDate.toISOString(),
            lastPayment: {
              paymentId: paymentId,
              orderId: orderId,
              amount: amount,
              currency: currency,
              method: 'paypal',
              date: now.toISOString(),
              status: 'completed'
            }
          });
          console.log('Usuário atualizado com sucesso:', userDoc.id);
        } else {
          // Usuário não existe - criar novo
          const newUserRef = await usersRef.add({
            email: buyerEmail,
            displayName: 'Usuário PayPal',
            isSubscriber: true,
            subscriptionStartDate: now.toISOString(),
            subscriptionEndDate: expirationDate.toISOString(),
            createdAt: now.toISOString(),
            lastPayment: {
              paymentId: paymentId,
              orderId: orderId,
              amount: amount,
              currency: currency,
              method: 'paypal',
              date: now.toISOString(),
              status: 'completed'
            }
          });
          console.log('Novo usuário criado com sucesso:', newUserRef.id);
        }

        return NextResponse.json({
          success: true,
          message: 'Pagamento capturado e assinatura ativada',
          paymentId: paymentId,
          orderId: orderId,
          captureData: captureData
        });

      } catch (subscriptionError) {
        console.error('Erro ao criar assinatura:', subscriptionError);
        
        // Pagamento foi capturado, mas assinatura falhou
        return NextResponse.json({
          success: false,
          error: 'Pagamento processado, mas erro ao criar assinatura',
          paymentId: paymentId,
          details: subscriptionError instanceof Error ? subscriptionError.message : String(subscriptionError)
        }, { status: 500 });
      }

    } else {
      console.error('Erro ao capturar PayPal Payment:', captureData);
      return NextResponse.json({
        success: false,
        error: 'Erro ao capturar pagamento PayPal',
        details: captureData
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Erro na API capture-order:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
